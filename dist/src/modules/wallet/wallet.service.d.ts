import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';
export interface WalletTransactionEvent {
    transactionId: string;
    walletId: string;
    type: string;
    reference: string;
    amount: number;
    status: string;
}
export declare class WalletService {
    private readonly prisma;
    private readonly ledger;
    private readonly exchangeRateService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, ledger: LedgerService, exchangeRateService: ExchangeRateService, eventEmitter: EventEmitter2);
    getUserWallets(userId: string): Promise<{
        balanceInNgn: Prisma.Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        updatedAt: Date;
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }[]>;
    getOrCreateWallet(userId: string, currency: Currency, chain?: string): Promise<{
        id: string;
        updatedAt: Date;
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }>;
    private defaultChainValueForCurrency;
    getWalletHistory(walletId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            fee: Prisma.Decimal;
            resolvedAt: Date | null;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        orderId: string | null;
        reference: string;
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        transactionId: string | null;
    })[]>;
    getUserHistory(userId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            fee: Prisma.Decimal;
            resolvedAt: Date | null;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        orderId: string | null;
        reference: string;
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        transactionId: string | null;
    })[]>;
    createTransaction(params: {
        walletId: string;
        type: LedgerType;
        amount: number;
        reference: string;
        status?: string;
        metadata?: any;
    }): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        fee: Prisma.Decimal;
        resolvedAt: Date | null;
    }>;
    private emitTransactionEvent;
    updateWalletDepositInfo(walletId: string, params: {
        address: string;
        derivationIndex: number;
        chain: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }>;
    findTransactionById(id: string): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        fee: Prisma.Decimal;
        resolvedAt: Date | null;
    } | null>;
    findTransactionByReference(reference: string): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        fee: Prisma.Decimal;
        resolvedAt: Date | null;
    } | null>;
    private static readonly VALID_TRANSITIONS;
    updateTransactionStatus(transactionId: string, status: string, metadata?: any): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        fee: Prisma.Decimal;
        resolvedAt: Date | null;
    }>;
    reverseTransaction(transactionId: string, reason: string): Promise<void>;
}
