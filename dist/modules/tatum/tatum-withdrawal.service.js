"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TatumWithdrawalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumWithdrawalService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const client_1 = require("../../generated/client/index.js");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
let TatumWithdrawalService = TatumWithdrawalService_1 = class TatumWithdrawalService {
    configService;
    httpService;
    prisma;
    walletService;
    tatumWallet;
    logger = new common_1.Logger(TatumWithdrawalService_1.name);
    apiKey;
    baseUrl = 'https://api.tatum.io/v4';
    constructor(configService, httpService, prisma, walletService, tatumWallet) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    get headers() {
        return { 'x-api-key': this.apiKey };
    }
    async processWithdrawal(params) {
        const { walletId, amount, destinationAddress, currency } = params;
        this.logger.log(`Initiating withdrawal: ${amount} ${currency} to ${destinationAddress}`);
        const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet)
            throw new common_1.BadRequestException('Wallet not found');
        const available = wallet.balance.minus(wallet.reservedBalance);
        if (available.lessThan(amount)) {
            throw new common_1.BadRequestException(`Insufficient balance. Available: ${available.toString()} ${currency}`);
        }
        this.validateAddress(currency, destinationAddress);
        const chain = this.tatumWallet.mapCurrencyToChain(currency);
        const body = await this.buildTransferBody(currency, destinationAddress, amount.toString());
        let txId;
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/${chain}/transaction`, body, {
                headers: this.headers,
            }).pipe((0, rxjs_1.retry)({
                count: 2,
                delay: (error, retryCount) => {
                    this.logger.warn(`Withdrawal retry ${retryCount} for ${currency}: ${error.message}`);
                    return (0, rxjs_1.timer)(retryCount * 2000);
                },
            })));
            txId = response.data.txId;
            if (!txId) {
                throw new Error('No txId returned from Tatum');
            }
        }
        catch (error) {
            const tatumMsg = error.response?.data?.message || error.message;
            this.logger.error(`Blockchain submission failed for ${currency}: ${tatumMsg}`);
            await this.prisma.walletTransaction.create({
                data: {
                    walletId,
                    type: client_1.LedgerType.WITHDRAWAL,
                    amount,
                    status: 'FAILED',
                    reference: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    metadata: {
                        destination: destinationAddress,
                        blockchain: chain,
                        lastError: tatumMsg,
                        retryCount: 0,
                    },
                },
            });
            throw new common_1.InternalServerErrorException(`Withdrawal failed: ${tatumMsg}`);
        }
        await this.prisma.walletTransaction.create({
            data: {
                walletId,
                type: client_1.LedgerType.WITHDRAWAL,
                amount,
                status: 'PENDING',
                reference: txId,
                metadata: {
                    destination: destinationAddress,
                    blockchain: chain,
                    initiatedAt: new Date().toISOString(),
                },
            },
        });
        this.logger.log(`Withdrawal submitted: ${txId} (${amount} ${currency})`);
        return { txId, status: 'PENDING' };
    }
    async retryWithdrawal(transactionId) {
        const tx = await this.prisma.walletTransaction.findUnique({
            where: { id: transactionId },
            include: { wallet: true },
        });
        if (!tx || tx.status !== 'FAILED') {
            throw new common_1.BadRequestException('Transaction not found or not in FAILED status');
        }
        const meta = tx.metadata || {};
        await this.prisma.walletTransaction.delete({ where: { id: transactionId } });
        return this.processWithdrawal({
            walletId: tx.walletId,
            amount: tx.amount.toNumber(),
            destinationAddress: meta.destination,
            currency: tx.wallet.currency,
        });
    }
    validateAddress(currency, address) {
        if (!address || typeof address !== 'string') {
            throw new common_1.BadRequestException('Invalid destination address');
        }
        const trimmed = address.trim();
        switch (currency) {
            case client_1.Currency.BTC:
                if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(trimmed)) {
                    throw new common_1.BadRequestException('Invalid Bitcoin address format');
                }
                break;
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                    throw new common_1.BadRequestException('Invalid Ethereum address format');
                }
                break;
            default:
                throw new common_1.BadRequestException(`Unsupported withdrawal currency: ${currency}`);
        }
    }
    async buildTransferBody(currency, to, amount) {
        const mnemonic = this.configService.get(`TATUM_${currency}_MNEMONIC`);
        const addressIndex = this.configService.get(`TATUM_${currency}_DERIVATION_INDEX`, 0);
        switch (currency) {
            case client_1.Currency.BTC: {
                if (!mnemonic) {
                    throw new common_1.InternalServerErrorException(`Missing TATUM_BTC_MNEMONIC environment variable`);
                }
                const privateKey = await this.tatumWallet.generatePrivateKey(client_1.Currency.BTC, mnemonic, addressIndex);
                return {
                    fromAddress: [{
                            address: await this.tatumWallet.generateAddress(client_1.Currency.BTC, this.configService.get('TATUM_BTC_XPUBLIC') || '', addressIndex),
                            signatureId: privateKey,
                        }],
                    to: [{ address: to, value: parseFloat(amount) }],
                };
            }
            case client_1.Currency.ETH: {
                if (!mnemonic) {
                    throw new common_1.InternalServerErrorException(`Missing TATUM_ETH_MNEMONIC environment variable`);
                }
                const privateKey = await this.tatumWallet.generatePrivateKey(client_1.Currency.ETH, mnemonic, addressIndex);
                return {
                    to,
                    currency: 'ETH',
                    amount,
                    fromPrivateKey: privateKey,
                };
            }
            case client_1.Currency.USDT:
            case client_1.Currency.USDC: {
                if (!mnemonic) {
                    throw new common_1.InternalServerErrorException(`Missing TATUM_${currency}_MNEMONIC environment variable`);
                }
                const privateKey = await this.tatumWallet.generatePrivateKey(currency, mnemonic, addressIndex);
                return {
                    to,
                    currency,
                    amount,
                    fromPrivateKey: privateKey,
                    fee: { gasLimit: '100000', gasPrice: '20' },
                };
            }
            default:
                throw new common_1.BadRequestException(`Withdrawals not supported for ${currency}`);
        }
    }
};
exports.TatumWithdrawalService = TatumWithdrawalService;
exports.TatumWithdrawalService = TatumWithdrawalService = TatumWithdrawalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        tatum_wallet_service_1.TatumWalletService])
], TatumWithdrawalService);
//# sourceMappingURL=tatum-withdrawal.service.js.map