import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { Currency, LedgerType } from '@prisma/client';
export declare class WalletService {
    private readonly prisma;
    private readonly ledger;
    constructor(prisma: PrismaService, ledger: LedgerService);
    getUserWallets(userId: string): Promise<({
        _count: {
            ledgerEntries: number;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        version: number;
    })[]>;
    getOrCreateWallet(userId: string, currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        version: number;
    }>;
    getWalletHistory(walletId: string, limit?: number, offset?: number): Promise<({
        transaction: {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        transactionId: string | null;
        orderId: string | null;
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
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
    }>;
    verifyAndSyncBalance(walletId: string): Promise<Prisma.Decimal>;
    updateWalletAddress(walletId: string, address: string): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        version: number;
    }>;
    findTransactionByReference(reference: string): Promise<{
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
    } | null>;
    updateTransactionStatus(transactionId: string, status: string, metadata?: any): Promise<{
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
    }>;
    reverseTransaction(transactionId: string, reason: string): Promise<void>;
}
import { Prisma } from '@prisma/client';
