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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
let TransactionsService = class TransactionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTransactionHistory(userId, filters) {
        const limit = filters.limit ? Number(filters.limit) : 20;
        const offset = filters.offset ? Number(filters.offset) : 0;
        const ledgerWhere = {
            wallet: { userId },
        };
        const txWhere = {
            wallet: { userId },
        };
        if (filters.walletId) {
            ledgerWhere.walletId = filters.walletId;
            txWhere.walletId = filters.walletId;
        }
        if (filters.currency) {
            ledgerWhere.wallet = { ...ledgerWhere.wallet, currency: filters.currency };
            txWhere.wallet = { ...txWhere.wallet, currency: filters.currency };
        }
        if (filters.type) {
            ledgerWhere.type = filters.type;
            txWhere.type = filters.type;
        }
        if (filters.startDate || filters.endDate) {
            const dateFilter = {};
            if (filters.startDate)
                dateFilter.gte = new Date(filters.startDate);
            if (filters.endDate)
                dateFilter.lte = new Date(filters.endDate);
            ledgerWhere.createdAt = dateFilter;
            txWhere.createdAt = dateFilter;
        }
        const status = filters.status?.toUpperCase();
        let queryLedgers = true;
        let queryTxs = true;
        if (status) {
            if (status === 'COMPLETED') {
                queryTxs = false;
            }
            else {
                queryLedgers = false;
                txWhere.status = status;
            }
        }
        else {
            txWhere.status = { not: 'COMPLETED' };
        }
        let mappedLedgers = [];
        let mappedTxs = [];
        let totalLedgers = 0;
        let totalTxs = 0;
        if (queryLedgers) {
            totalLedgers = await this.prisma.ledgerEntry.count({ where: ledgerWhere });
            const ledgers = await this.prisma.ledgerEntry.findMany({
                where: ledgerWhere,
                orderBy: { createdAt: 'desc' },
                take: limit + offset,
                include: {
                    transaction: true,
                    wallet: { select: { currency: true, userId: true } },
                    order: {
                        include: {
                            buyer: { select: { email: true, profile: { select: { firstName: true } } } },
                            seller: { select: { email: true, profile: { select: { firstName: true } } } },
                        },
                    },
                },
            });
            mappedLedgers = ledgers.map((l) => {
                let details = {};
                if (l.transaction) {
                    details = {
                        paymentMethod: l.wallet.currency === 'NGN' ? 'Paystack' : 'Tatum',
                        blockchainTxHash: l.transaction.metadata ? l.transaction.metadata.blockchainTxHash : null,
                    };
                }
                else if (l.order) {
                    const isBuyer = l.wallet.userId === l.order.buyerId;
                    details = {
                        orderId: l.order.id,
                        fiatAmount: l.order.fiatAmount.toString(),
                        cryptoAmount: l.order.cryptoAmount.toString(),
                        counterparty: isBuyer
                            ? l.order.seller.profile?.firstName || l.order.seller.email
                            : l.order.buyer.profile?.firstName || l.order.buyer.email,
                    };
                }
                return {
                    id: l.id,
                    walletId: l.walletId,
                    currency: l.wallet.currency,
                    type: l.type,
                    amount: l.amount.toString(),
                    fee: l.transaction?.fee ? l.transaction.fee.toString() : '0',
                    status: 'COMPLETED',
                    reference: l.reference,
                    balanceAfter: l.balanceAfter.toString(),
                    createdAt: l.createdAt,
                    updatedAt: l.createdAt,
                    details,
                };
            });
        }
        if (queryTxs) {
            totalTxs = await this.prisma.walletTransaction.count({ where: txWhere });
            const txs = await this.prisma.walletTransaction.findMany({
                where: txWhere,
                orderBy: { createdAt: 'desc' },
                take: limit + offset,
                include: {
                    wallet: { select: { currency: true } },
                },
            });
            mappedTxs = txs.map((t) => ({
                id: t.id,
                walletId: t.walletId,
                currency: t.wallet.currency,
                type: t.type,
                amount: t.amount.toString(),
                fee: t.fee.toString(),
                status: t.status,
                reference: t.reference,
                balanceAfter: null,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                details: {
                    paymentMethod: t.wallet.currency === 'NGN' ? 'Paystack' : 'Tatum',
                    blockchainTxHash: t.metadata ? t.metadata.blockchainTxHash : null,
                },
            }));
        }
        const merged = [...mappedLedgers, ...mappedTxs];
        merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const paginated = merged.slice(offset, offset + limit);
        return {
            total: totalLedgers + totalTxs,
            limit,
            offset,
            data: paginated,
        };
    }
    async getTransactionDetails(userId, id) {
        const ledger = await this.prisma.ledgerEntry.findFirst({
            where: {
                id,
                wallet: { userId },
            },
            include: {
                transaction: true,
                wallet: { select: { currency: true, userId: true } },
                order: {
                    include: {
                        buyer: { select: { email: true, profile: { select: { firstName: true } } } },
                        seller: { select: { email: true, profile: { select: { firstName: true } } } },
                    },
                },
            },
        });
        if (ledger) {
            const isBuyer = ledger.wallet.userId === ledger.order?.buyerId;
            const details = ledger.order
                ? {
                    orderId: ledger.order.id,
                    fiatAmount: ledger.order.fiatAmount.toString(),
                    cryptoAmount: ledger.order.cryptoAmount.toString(),
                    feePaid: ledger.order.feeAmount.toString(),
                    counterparty: isBuyer
                        ? ledger.order.seller.profile?.firstName || ledger.order.seller.email
                        : ledger.order.buyer.profile?.firstName || ledger.order.buyer.email,
                }
                : {
                    paymentMethod: ledger.wallet.currency === 'NGN' ? 'Paystack' : 'Tatum',
                    blockchainTxHash: ledger.transaction?.metadata ? ledger.transaction.metadata.blockchainTxHash : null,
                };
            return {
                id: ledger.id,
                walletId: ledger.walletId,
                currency: ledger.wallet.currency,
                type: ledger.type,
                amount: ledger.amount.toString(),
                fee: ledger.transaction?.fee ? ledger.transaction.fee.toString() : '0',
                status: 'COMPLETED',
                reference: ledger.reference,
                balanceAfter: ledger.balanceAfter.toString(),
                createdAt: ledger.createdAt,
                updatedAt: ledger.createdAt,
                details,
            };
        }
        const tx = await this.prisma.walletTransaction.findFirst({
            where: {
                id,
                wallet: { userId },
            },
            include: {
                wallet: { select: { currency: true } },
            },
        });
        if (!tx) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return {
            id: tx.id,
            walletId: tx.walletId,
            currency: tx.wallet.currency,
            type: tx.type,
            amount: tx.amount.toString(),
            fee: tx.fee.toString(),
            status: tx.status,
            reference: tx.reference,
            balanceAfter: null,
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt,
            details: {
                paymentMethod: tx.wallet.currency === 'NGN' ? 'Paystack' : 'Tatum',
                blockchainTxHash: tx.metadata ? tx.metadata.blockchainTxHash : null,
                metadata: tx.metadata,
            },
        };
    }
    async exportTransactions(userId, filters) {
        const fullFilters = { ...filters, limit: 10000, offset: 0 };
        const history = await this.getTransactionHistory(userId, fullFilters);
        return this.jsonToCsv(history.data);
    }
    jsonToCsv(data) {
        if (data.length === 0)
            return '';
        const headers = ['ID', 'Date', 'Type', 'Asset', 'Amount', 'Fee', 'Status', 'Reference', 'Balance After'];
        const rows = data.map((tx) => [
            tx.id,
            tx.createdAt.toISOString ? tx.createdAt.toISOString() : tx.createdAt,
            tx.type,
            tx.currency,
            tx.amount,
            tx.fee,
            tx.status,
            tx.reference,
            tx.balanceAfter || 'N/A',
        ]);
        return [headers.join(','), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map