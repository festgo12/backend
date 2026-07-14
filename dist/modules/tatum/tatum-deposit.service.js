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
var TatumDepositService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumDepositService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const client_1 = require("../../generated/client/index.js");
let TatumDepositService = TatumDepositService_1 = class TatumDepositService {
    prisma;
    walletService;
    logger = new common_1.Logger(TatumDepositService_1.name);
    constructor(prisma, walletService) {
        this.prisma = prisma;
        this.walletService = walletService;
    }
    async handleDepositNotification(payload) {
        const { address, amount, asset, txId } = payload;
        this.logger.log(`Processing deposit: ${amount} ${asset} to ${address} (TX: ${txId})`);
        const wallet = await this.prisma.wallet.findUnique({
            where: { address: address },
            include: { user: true },
        });
        if (!wallet) {
            this.logger.warn(`No wallet found for address ${address}. Ignoring deposit.`);
            return;
        }
        const existingTx = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (existingTx) {
            this.logger.log(`Transaction ${txId} already processed. Skipping.`);
            return;
        }
        await this.walletService.createTransaction({
            walletId: wallet.id,
            type: client_1.LedgerType.DEPOSIT,
            amount: parseFloat(amount),
            reference: txId,
            metadata: {
                source: 'TATUM_WEBHOOK',
                blockTxId: txId,
                asset: asset,
                address: address,
            },
        });
        this.logger.log(`Successfully credited ${amount} ${asset} to user ${wallet.userId}`);
    }
    async syncBalanceWithBlockchain(walletId) {
    }
};
exports.TatumDepositService = TatumDepositService;
exports.TatumDepositService = TatumDepositService = TatumDepositService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService])
], TatumDepositService);
//# sourceMappingURL=tatum-deposit.service.js.map