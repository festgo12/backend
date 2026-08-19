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
var BtcDepositProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcDepositProcessorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
let BtcDepositProcessorService = BtcDepositProcessorService_1 = class BtcDepositProcessorService {
    prisma;
    walletService;
    config;
    logger = new common_1.Logger(BtcDepositProcessorService_1.name);
    constructor(prisma, walletService, config) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.config = config;
    }
    async getPendingCount() {
        return this.prisma.walletTransaction.count({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'BTC_WEBHOOK' },
            },
        });
    }
    async creditDeposit(params) {
        const { amount, txHash, sourceAddress, confirmations, walletId } = params;
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: txHash },
        });
        if (existing)
            return;
        try {
            await this.walletService.createTransaction({
                walletId,
                type: client_1.LedgerType.DEPOSIT,
                amount,
                reference: txHash,
                status: 'COMPLETED',
                metadata: {
                    source: 'QN_STREAMS',
                    listener: 'BTC_WEBHOOK',
                    blockTxId: txHash,
                    asset: client_1.Currency.BTC,
                    address: params.address,
                    sourceAddress,
                    confirmations,
                    receivedAt: new Date().toISOString(),
                },
            });
            this.logger.log(`BTC deposit credited: ${amount} BTC to wallet ${walletId} (TX: ${txHash})`);
        }
        catch (error) {
            const err = error;
            if (err.code === 'P2002') {
                this.logger.debug(`BTC deposit ${txHash} already recorded for wallet ${walletId}; skipping`);
            }
            else {
                this.logger.error(`Failed to credit BTC deposit ${txHash} to wallet ${walletId}: ${err.message}`);
            }
        }
    }
};
exports.BtcDepositProcessorService = BtcDepositProcessorService;
exports.BtcDepositProcessorService = BtcDepositProcessorService = BtcDepositProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        crypto_config_service_1.CryptoConfigService])
], BtcDepositProcessorService);
//# sourceMappingURL=btc-deposit-processor.service.js.map