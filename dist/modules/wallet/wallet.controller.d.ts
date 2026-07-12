import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { Currency } from '@prisma/client';
import type { User } from '@prisma/client';
export declare class WalletController {
    private readonly walletService;
    private readonly tatumWallet;
    private readonly logger;
    constructor(walletService: WalletService, tatumWallet: TatumWalletService);
    getWallets(user: User): Promise<{
        balanceInNgn: import("@prisma/client/runtime/library").Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: import("@prisma/client/runtime/library").Decimal;
        reservedBalance: import("@prisma/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import(".prisma/client").$Enums.Currency;
        };
        transaction: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.LedgerType;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.LedgerType;
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
