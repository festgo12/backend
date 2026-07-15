import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';
export declare class WalletService {
    private readonly prisma;
    private readonly ledger;
    private readonly exchangeRateService;
    constructor(prisma: PrismaService, ledger: LedgerService, exchangeRateService: TatumExchangeRateService);
    getUserWallets(userId: string): Promise<{
        balanceInNgn: Prisma.Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        updatedAt: Date;
        version: number;
    }[]>;
    getOrCreateWallet(userId: string, currency: Currency): Promise<{
        id: string;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        updatedAt: Date;
        version: number;
    }>;
    getWalletHistory(walletId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
        } | null;
    } & {
        id: string;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        balanceAfter: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
    })[]>;
    getUserHistory(userId: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
        } | null;
    } & {
        id: string;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        balanceAfter: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
    })[]>;
    createTransaction(params: {
        walletId: string;
        type: LedgerType;
        amount: number;
        reference: string;
        status?: string;
        metadata?: any;
    }): Promise<{
        id: string;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: string;
        fee: Prisma.Decimal;
    }>;
    verifyAndSyncBalance(walletId: string): Promise<Prisma.Decimal>;
    updateWalletAddress(walletId: string, address: string): Promise<{
        id: string;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        updatedAt: Date;
        version: number;
    }>;
    findTransactionByReference(reference: string): Promise<{
        id: string;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: string;
        fee: Prisma.Decimal;
    } | null>;
    updateTransactionStatus(transactionId: string, status: string, metadata?: any): Promise<{
        id: string;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: string;
        fee: Prisma.Decimal;
    }>;
    reverseTransaction(transactionId: string, reason: string): Promise<void>;
}
