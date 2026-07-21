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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const ledger_service_1 = require("./ledger.service");
const tatum_exchange_rate_service_1 = require("../tatum/tatum-exchange-rate.service");
const client_1 = require("../../generated/client/index.js");
let WalletService = class WalletService {
    prisma;
    ledger;
    exchangeRateService;
    constructor(prisma, ledger, exchangeRateService) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.exchangeRateService = exchangeRateService;
    }
    async getUserWallets(userId) {
        const wallets = await this.prisma.wallet.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { ledgerEntries: true },
                },
            },
        });
        const rates = this.exchangeRateService.getAllRates();
        return wallets.map((w) => ({
            ...w,
            balanceInNgn: w.balance.mul(rates[w.currency] || 0),
        }));
    }
    async getOrCreateWallet(userId, currency) {
        let wallet = await this.prisma.wallet.findUnique({
            where: {
                userId_currency: { userId, currency },
            },
        });
        if (!wallet) {
            wallet = await this.prisma.wallet.create({
                data: {
                    userId,
                    currency,
                    balance: 0,
                },
            });
        }
        return wallet;
    }
    async getWalletHistory(walletId, limit = 20, offset = 0) {
        return this.prisma.ledgerEntry.findMany({
            where: { walletId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                transaction: true,
                wallet: {
                    select: {
                        currency: true,
                    },
                },
            },
        });
    }
    async getUserHistory(userId, limit = 20, offset = 0) {
        return this.prisma.ledgerEntry.findMany({
            where: {
                wallet: { userId },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                transaction: true,
                wallet: {
                    select: {
                        currency: true,
                    },
                },
            },
        });
    }
    async createTransaction(params) {
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: params.walletId,
                    type: params.type,
                    amount: new client_1.Prisma.Decimal(params.amount),
                    reference: params.reference,
                    status: params.status || 'PENDING',
                    metadata: params.metadata || {},
                },
            });
            if (params.status === 'COMPLETED') {
                await this.ledger.createEntry(tx, {
                    walletId: params.walletId,
                    transactionId: transaction.id,
                    amount: params.amount,
                    type: params.type,
                    reference: `${params.reference}-ledger`,
                    metadata: params.metadata,
                });
            }
            return transaction;
        });
    }
    async verifyAndSyncBalance(walletId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
            include: {
                snapshots: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found');
        const lastSnapshot = wallet.snapshots[0];
        const snapshotBalance = lastSnapshot ? lastSnapshot.balance : new client_1.Prisma.Decimal(0);
        const snapshotDate = lastSnapshot ? lastSnapshot.createdAt : new Date(0);
        const ledgerSum = await this.prisma.ledgerEntry.aggregate({
            where: {
                walletId,
                createdAt: { gt: snapshotDate },
            },
            _sum: {
                amount: true,
            },
        });
        const calculatedBalance = snapshotBalance.plus(ledgerSum._sum.amount || 0);
        if (!calculatedBalance.equals(wallet.balance)) {
            await this.prisma.wallet.update({
                where: { id: walletId },
                data: { balance: calculatedBalance },
            });
        }
        return calculatedBalance;
    }
    async updateWalletAddress(walletId, address) {
        return this.prisma.wallet.update({
            where: { id: walletId },
            data: { address },
        });
    }
    async findTransactionById(id) {
        return this.prisma.walletTransaction.findUnique({
            where: { id },
        });
    }
    async findTransactionByReference(reference) {
        return this.prisma.walletTransaction.findUnique({
            where: { reference },
        });
    }
    async updateTransactionStatus(transactionId, status, metadata) {
        return this.prisma.$transaction(async (tx) => {
            const current = await tx.walletTransaction.findUnique({
                where: { id: transactionId },
            });
            if (!current)
                throw new common_1.NotFoundException('Transaction not found');
            const updatedMetadata = {
                ...(current.metadata || {}),
                ...(metadata || {}),
            };
            const transaction = await tx.walletTransaction.update({
                where: { id: transactionId },
                data: {
                    status,
                    metadata: updatedMetadata,
                },
            });
            if (status === 'COMPLETED') {
                const existingEntry = await tx.ledgerEntry.findFirst({
                    where: { transactionId: transaction.id },
                });
                if (!existingEntry) {
                    await this.ledger.createEntry(tx, {
                        walletId: transaction.walletId,
                        transactionId: transaction.id,
                        amount: transaction.type === client_1.LedgerType.WITHDRAWAL
                            ? -transaction.amount.toNumber()
                            : transaction.amount.toNumber(),
                        type: transaction.type,
                        reference: `${transaction.reference}-ledger`,
                        metadata: updatedMetadata,
                    });
                }
            }
            return transaction;
        });
    }
    async reverseTransaction(transactionId, reason) {
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.walletTransaction.findUnique({
                where: { id: transactionId },
            });
            if (!transaction || transaction.status === 'REVERSED')
                return;
            await tx.walletTransaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REVERSED',
                    metadata: {
                        ...(transaction.metadata || {}),
                        reverse_reason: reason,
                    },
                },
            });
            await this.ledger.createEntry(tx, {
                walletId: transaction.walletId,
                transactionId: transaction.id,
                amount: Math.abs(transaction.amount.toNumber()),
                type: client_1.LedgerType.TRADE_REFUND,
                reference: `${transaction.reference}-rev-${Date.now()}`,
                metadata: { reason },
            });
        });
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        tatum_exchange_rate_service_1.TatumExchangeRateService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map