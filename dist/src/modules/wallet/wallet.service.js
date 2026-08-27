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
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
const ledger_service_1 = require("./ledger.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const client_1 = require("../../generated/client/index.js");
let WalletService = class WalletService {
    static { WalletService_1 = this; }
    prisma;
    ledger;
    exchangeRateService;
    eventEmitter;
    constructor(prisma, ledger, exchangeRateService, eventEmitter) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.exchangeRateService = exchangeRateService;
        this.eventEmitter = eventEmitter;
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
        return this.prisma.wallet.upsert({
            where: { userId_currency: { userId, currency } },
            create: { userId, currency, balance: 0 },
            update: {},
        });
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
        const transaction = await this.prisma.$transaction(async (tx) => {
            const txRecord = await tx.walletTransaction.create({
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
                    transactionId: txRecord.id,
                    amount: params.amount,
                    type: params.type,
                    reference: `${params.reference}-ledger`,
                    metadata: params.metadata,
                });
            }
            return txRecord;
        });
        this.emitTransactionEvent(transaction, params.status || 'PENDING');
        return transaction;
    }
    emitTransactionEvent(transaction, status) {
        const payload = {
            transactionId: transaction.id,
            walletId: transaction.walletId,
            type: transaction.type,
            reference: transaction.reference,
            amount: transaction.amount.toNumber(),
            status,
        };
        if (transaction.type === client_1.LedgerType.WITHDRAWAL) {
            if (status === 'COMPLETED') {
                this.eventEmitter.emit('wallet.withdrawal.confirmed', payload);
            }
            else if (status === 'FAILED') {
                this.eventEmitter.emit('wallet.withdrawal.failed', payload);
            }
            else {
                this.eventEmitter.emit('wallet.withdrawal.initiated', payload);
            }
        }
        else if (transaction.type === client_1.LedgerType.DEPOSIT && status === 'COMPLETED') {
            this.eventEmitter.emit('wallet.deposit.confirmed', payload);
        }
    }
    async updateWalletDepositInfo(walletId, params) {
        return this.prisma.wallet.update({
            where: { id: walletId },
            data: params,
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
    static VALID_TRANSITIONS = {
        PENDING: ['COMPLETED', 'FAILED', 'PROCESSING'],
        PROCESSING: ['COMPLETED', 'FAILED'],
        FAILED: ['CANCELLED'],
        COMPLETED: ['REVERSED'],
        REVERSED: [],
        CANCELLED: [],
    };
    async updateTransactionStatus(transactionId, status, metadata) {
        let changed = false;
        const transaction = await this.prisma.$transaction(async (tx) => {
            const current = await tx.walletTransaction.findUnique({
                where: { id: transactionId },
            });
            if (!current)
                throw new common_1.NotFoundException('Transaction not found');
            const allowed = WalletService_1.VALID_TRANSITIONS[current.status];
            if (!allowed || !allowed.includes(status)) {
                throw new common_1.BadRequestException(`Cannot transition from ${current.status} to ${status}`);
            }
            if (status === 'REVERSED') {
                throw new common_1.BadRequestException('Reversals must use reverseTransaction(); do not call updateTransactionStatus with REVERSED');
            }
            if (current.status === status)
                return current;
            changed = true;
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
                if (!existingEntry && !updatedMetadata.ledgerSettled) {
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
        if (changed) {
            this.emitTransactionEvent(transaction, status);
        }
        return transaction;
    }
    async reverseTransaction(transactionId, reason) {
        const reversedTransaction = await this.prisma.$transaction(async (tx) => {
            const affected = await tx.$executeRaw `
        UPDATE "WalletTransaction"
        SET "status" = 'REVERSED',
            "metadata" = "metadata" || ${JSON.stringify({ reverse_reason: reason })}::jsonb
        WHERE "id" = ${transactionId}::uuid
          AND "status" != 'REVERSED'
      `;
            if (affected === 0)
                return null;
            const transaction = await tx.walletTransaction.findUnique({
                where: { id: transactionId },
            });
            if (!transaction)
                return null;
            const depositTypes = [client_1.LedgerType.DEPOSIT, client_1.LedgerType.GIFT_CARD_PURCHASE];
            const isDeposit = depositTypes.includes(transaction.type);
            const reverseAmount = isDeposit
                ? -Math.abs(transaction.amount.toNumber())
                : Math.abs(transaction.amount.toNumber());
            await this.ledger.createEntry(tx, {
                walletId: transaction.walletId,
                transactionId: transaction.id,
                amount: reverseAmount,
                type: client_1.LedgerType.TRADE_REFUND,
                reference: `${transaction.reference}-rev`,
                metadata: { reason },
            });
            return transaction;
        });
        if (reversedTransaction?.type === client_1.LedgerType.WITHDRAWAL) {
            this.emitTransactionEvent(reversedTransaction, 'FAILED');
        }
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        exchange_rate_service_1.ExchangeRateService,
        event_emitter_1.EventEmitter2])
], WalletService);
//# sourceMappingURL=wallet.service.js.map