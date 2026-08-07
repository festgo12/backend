import type { Response } from 'express';
import { TransactionsService, type TransactionFilters } from './transactions.service';
import type { User } from '@src/generated/client';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    getHistory(user: User, query: TransactionFilters): Promise<{
        total: number;
        limit: number;
        offset: number;
        data: any[];
    }>;
    export(user: User, query: TransactionFilters, res: Response): Promise<Response<any, Record<string, any>>>;
    getDetails(user: User, id: string): Promise<{
        id: string;
        walletId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        type: import("@src/generated/client").$Enums.LedgerType;
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
        currency: import("@src/generated/client").$Enums.Currency;
        type: import("@src/generated/client").$Enums.LedgerType;
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
            metadata: import("@src/generated/client/runtime/library").JsonValue;
        };
    }>;
}
