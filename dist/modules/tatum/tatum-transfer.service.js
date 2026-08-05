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
var TatumTransferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumTransferService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const client_1 = require("../../generated/client/index.js");
const prisma_service_1 = require("../../core/database/prisma.service");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
let TatumTransferService = TatumTransferService_1 = class TatumTransferService {
    configService;
    httpService;
    prisma;
    tatumWallet;
    logger = new common_1.Logger(TatumTransferService_1.name);
    apiKey;
    baseUrl = 'https://api.tatum.io/v3';
    constructor(configService, httpService, prisma, tatumWallet) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.tatumWallet = tatumWallet;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    get headers() {
        return { 'x-api-key': this.apiKey };
    }
    async transfer(params) {
        const { asset, fromAddress, fromIndex, to, amount } = params;
        if (!fromAddress) {
            throw new common_1.BadRequestException(`Source address is required for ${asset} transfer`);
        }
        if (!to) {
            throw new common_1.BadRequestException('Destination address is required');
        }
        const chain = this.tatumWallet.mapCurrencyToChain(asset);
        const body = await this.buildTransferBody(asset, fromAddress, fromIndex, to, amount);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService
                .post(`${this.baseUrl}/${chain}/transaction`, body, {
                headers: this.headers,
            })
                .pipe((0, rxjs_1.retry)({
                count: 2,
                delay: (error, retryCount) => {
                    this.logger.warn(`Transfer retry ${retryCount} for ${asset}: ${error.message}`);
                    return (0, rxjs_1.timer)(retryCount * 2000);
                },
            })));
            const txId = response.data?.txId;
            if (!txId) {
                throw new Error('No txId returned from Tatum');
            }
            this.logger.log(`Transfer broadcast: ${amount} ${asset} ${fromAddress} -> ${to} (TX: ${txId})`);
            return txId;
        }
        catch (error) {
            const tatumMsg = error.response?.data?.message || error.message;
            this.logger.error(`Blockchain transfer failed for ${asset}: ${tatumMsg}`);
            throw new common_1.InternalServerErrorException(`Crypto transfer failed: ${tatumMsg}`);
        }
    }
    async buildTransferBody(asset, fromAddress, fromIndex, to, amount) {
        const mnemonic = this.configService.get(`TATUM_${asset}_MNEMONIC`);
        if (!mnemonic) {
            throw new common_1.InternalServerErrorException(`Missing TATUM_${asset}_MNEMONIC environment variable`);
        }
        const privateKey = await this.tatumWallet.generatePrivateKey(asset, mnemonic, fromIndex);
        switch (asset) {
            case client_1.Currency.BTC:
                return {
                    fromAddress: [
                        {
                            address: fromAddress,
                            signatureId: privateKey,
                        },
                    ],
                    to: [{ address: to, value: parseFloat(amount) }],
                };
            case client_1.Currency.ETH:
                return {
                    to,
                    currency: 'ETH',
                    amount,
                    fromPrivateKey: privateKey,
                };
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                return {
                    to,
                    currency: asset,
                    amount,
                    fromPrivateKey: privateKey,
                    fee: { gasLimit: '100000', gasPrice: '20' },
                };
            default:
                throw new common_1.BadRequestException(`Transfers not supported for ${asset}`);
        }
    }
    async recordOnChainTransaction(params) {
        const { walletId, orderId, asset, txId, fromAddress, to, amount, type, status, } = params;
        const entryType = type === 'fee' ? client_1.LedgerType.FEE : client_1.LedgerType.TRADE_SETTLEMENT;
        return this.prisma.walletTransaction.create({
            data: {
                walletId,
                type: entryType,
                amount,
                status: status || 'PENDING',
                reference: txId,
                metadata: {
                    onChain: true,
                    ledgerSettled: true,
                    orderId,
                    asset,
                    fromAddress,
                    to,
                    broadcastAt: new Date().toISOString(),
                },
            },
        });
    }
};
exports.TatumTransferService = TatumTransferService;
exports.TatumTransferService = TatumTransferService = TatumTransferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        tatum_wallet_service_1.TatumWalletService])
], TatumTransferService);
//# sourceMappingURL=tatum-transfer.service.js.map