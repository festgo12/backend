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
const client_1 = require("@prisma/client");
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
    baseUrl = 'https://api.tatum.io/v3';
    constructor(configService, httpService, prisma, walletService, tatumWallet) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    async processWithdrawal(params) {
        const { walletId, amount, destinationAddress, currency } = params;
        try {
            this.logger.log(`Initiating withdrawal: ${amount} ${currency} to ${destinationAddress}`);
            const chain = this.mapCurrencyToChain(currency);
            const body = await this.buildTransferBody(currency, destinationAddress, amount.toString());
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/${chain}/transaction`, body, { headers: { 'x-api-key': this.apiKey } }).pipe((0, rxjs_1.retry)({
                count: 2,
                delay: (error, retryCount) => (0, rxjs_1.timer)(retryCount * 2000),
            })));
            const txId = response.data.txId;
            await this.prisma.walletTransaction.create({
                data: {
                    walletId,
                    type: client_1.LedgerType.WITHDRAWAL,
                    amount: amount,
                    status: 'PENDING',
                    reference: txId,
                    metadata: {
                        destination: destinationAddress,
                        blockchain: chain,
                        tatumResponse: response.data
                    },
                },
            });
            return { txId, status: 'PENDING' };
        }
        catch (error) {
            this.logger.error(`Withdrawal failed: ${error.message}`);
            throw error;
        }
    }
    mapCurrencyToChain(currency) {
        switch (currency) {
            case client_1.Currency.BTC: return 'bitcoin';
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC: return 'ethereum';
            default: throw new Error(`Unsupported withdrawal currency: ${currency}`);
        }
    }
    async buildTransferBody(currency, to, amount) {
        const mnemonic = this.configService.get(`TATUM_${currency}_MNEMONIC`);
        switch (currency) {
            case client_1.Currency.BTC:
                return {
                    fromAddress: [{ address: 'SENDER_ADDR_PLACEHOLDER', signatureId: 'KMS_ID_PLACEHOLDER' }],
                    to: [{ address: to, value: parseFloat(amount) }],
                };
            case client_1.Currency.ETH:
                return {
                    to,
                    currency: 'ETH',
                    amount,
                    fromPrivateKey: 'PRIVATE_KEY_FROM_VAULT',
                };
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                return {
                    to,
                    currency,
                    amount,
                    fromPrivateKey: 'PRIVATE_KEY_FROM_VAULT',
                    fee: { gasLimit: '100000', gasPrice: '20' },
                };
            default:
                throw new Error(`Transfer body not implemented for ${currency}`);
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