import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { Currency } from '@src/generated/client';
import type { User } from '@src/generated/client';
export declare class WalletController {
    private readonly walletService;
    private readonly tatumWallet;
    private readonly logger;
    constructor(walletService: WalletService, tatumWallet: TatumWalletService);
    getWallets(user: User): Promise<{
        balanceInNgn: import("@src/generated/client/runtime/library").Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        transactionId: string | null;
        orderId: string | null;
        balanceAfter: import("@src/generated/client/runtime/library").Decimal;
    })[]>;
    initWallet(user: User, currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
    }>;
    private hashCode;
}
