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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
let LedgerService = class LedgerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createEntry(tx, params) {
        const { walletId, transactionId, orderId, amount, type, reference, metadata } = params;
        const wallet = await tx.wallet.findUnique({
            where: { id: walletId },
            select: { balance: true },
        });
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        const currentBalance = new client_1.Prisma.Decimal(wallet.balance);
        const newBalance = currentBalance.plus(new client_1.Prisma.Decimal(amount));
        if (newBalance.lessThan(0)) {
            throw new common_1.ConflictException('Insufficient funds for this operation');
        }
        const entry = await tx.ledgerEntry.create({
            data: {
                walletId,
                transactionId,
                orderId,
                amount: new client_1.Prisma.Decimal(amount),
                type,
                reference,
                balanceAfter: newBalance,
                metadata: metadata || {},
            },
        });
        await tx.wallet.update({
            where: { id: walletId },
            data: {
                balance: newBalance,
            },
        });
        return entry;
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LedgerService);
//# sourceMappingURL=ledger.service.js.map