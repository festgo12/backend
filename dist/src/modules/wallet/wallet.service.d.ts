import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';
export declare class WalletService {
    private readonly prisma;
    private readonly ledger;
    private readonly exchangeRateService;
    constructor(prisma: PrismaService, ledger: LedgerService, exchangeRateService: ExchangeRateService);
    getUserWallets(userId: string): Promise<{
        balanceInNgn: Prisma.Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
    }[]>;
    getOrCreateWallet(userId: string, currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
    }>;
    getWalletHistory(walletId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        reference: string;
        balanceAfter: Prisma.Decimal;
    })[]>;
    getUserHistory(userId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        reference: string;
        balanceAfter: Prisma.Decimal;
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
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    }>;
    updateWalletDepositInfo(walletId: string, params: {
        address: string;
        derivationIndex: number;
        chain: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
    }>;
    findTransactionById(id: string): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    } | null>;
    findTransactionByReference(reference: string): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    } | null>;
    private static readonly VALID_TRANSITIONS;
    updateTransactionStatus(transactionId: string, status: string, metadata?: any): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    }>;
    reverseTransaction(transactionId: string, reason: string): Promise<void>;
}
