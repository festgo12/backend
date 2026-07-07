import { PrismaService } from '../../core/database/prisma.service';
import { Currency, LedgerType, Prisma } from '@prisma/client';
export interface TransactionFilters {
    walletId?: string;
    currency?: Currency;
    type?: LedgerType;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
export declare class TransactionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTransactionHistory(userId: string, filters: TransactionFilters): Promise<{
        total: number;
        limit: number;
        offset: number;
        data: any[];
    }>;
    getTransactionDetails(userId: string, id: string): Promise<{
        id: string;
        walletId: string;
        currency: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.LedgerType;
        amount: string;
        fee: string;
        status: string;
        reference: string;
        balanceAfter: string;
        createdAt: Date;
        updatedAt: Date;
        details: {
            orderId: string;
            fiatAmount: string;
            cryptoAmount: string;
            feePaid: string;
            counterparty: string | null;
            paymentMethod?: undefined;
            blockchainTxHash?: undefined;
        } | {
            paymentMethod: string;
            blockchainTxHash: any;
            orderId?: undefined;
            fiatAmount?: undefined;
            cryptoAmount?: undefined;
            feePaid?: undefined;
            counterparty?: undefined;
        };
    } | {
        id: string;
        walletId: string;
        currency: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.LedgerType;
        amount: string;
        fee: string;
        status: string;
        reference: string;
        balanceAfter: null;
        createdAt: Date;
        updatedAt: Date;
        details: {
            paymentMethod: string;
            blockchainTxHash: any;
            metadata: Prisma.JsonValue;
        };
    }>;
    exportTransactions(userId: string, filters: TransactionFilters): Promise<string>;
    private jsonToCsv;
}
