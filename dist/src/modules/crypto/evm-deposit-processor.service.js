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
var EvmDepositProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmDepositProcessorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
let EvmDepositProcessorService = EvmDepositProcessorService_1 = class EvmDepositProcessorService {
    prisma;
    walletService;
    config;
    logger = new common_1.Logger(EvmDepositProcessorService_1.name);
    constructor(prisma, walletService, config) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.config = config;
    }
    async getStatus() {
        const pendingCount = await this.prisma.walletTransaction.count({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'EVM_WEBHOOK' },
            },
        });
        return {
            enabled: true,
            pendingCount,
        };
    }
    async finalizePendingDeposits(maxBlock) {
        if (maxBlock < 1)
            return;
        const pending = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'EVM_WEBHOOK' },
            },
            take: 200,
        });
        for (const tx of pending) {
            const meta = (tx.metadata ?? {});
            const blockNumber = typeof meta.blockNumber === 'number' ? meta.blockNumber : NaN;
            if (!Number.isFinite(blockNumber) || blockNumber > maxBlock)
                continue;
            const required = this.config.evmConfirmations;
            const confirmations = maxBlock - blockNumber + 1;
            if (confirmations < required)
                continue;
            await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
                confirmations,
                completedAt: new Date().toISOString(),
            });
            this.logger.log(`EVM deposit finalized: ${tx.amount.toNumber()} ${meta.asset ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`);
        }
    }
};
exports.EvmDepositProcessorService = EvmDepositProcessorService;
exports.EvmDepositProcessorService = EvmDepositProcessorService = EvmDepositProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        crypto_config_service_1.CryptoConfigService])
], EvmDepositProcessorService);
//# sourceMappingURL=evm-deposit-processor.service.js.map