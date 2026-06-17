import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { Currency } from '@prisma/client';
import type { User } from '@prisma/client';
export declare class WalletController {
    private readonly walletService;
    private readonly tatumWallet;
    constructor(walletService: WalletService, tatumWallet: TatumWalletService);
    getWallets(user: User): Promise<({
        _count: {
            ledgerEntries: number;
        };
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: import("@prisma/client/runtime/library").Decimal;
        reservedBalance: import("@prisma/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    })[]>;
    getHistory(walletId: string, limit?: number, offset?: number): Promise<({
        transaction: {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        walletId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        reference: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        transactionId: string | null;
        orderId: string | null;
        balanceAfter: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    initWallet(user: User, currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: import("@prisma/client/runtime/library").Decimal;
        reservedBalance: import("@prisma/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    }>;
    private hashCode;
}
