import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { TatumWithdrawalService } from '../tatum/tatum-withdrawal.service';
import { TatumRiskService } from '../tatum/tatum-risk.service';
import { TatumWebhookService } from '../tatum/tatum-webhook.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
import { Currency } from '@src/generated/client';
import type { User } from '@src/generated/client';
export declare class WalletController {
    private readonly walletService;
    private readonly tatumWallet;
    private readonly tatumWithdrawal;
    private readonly tatumRisk;
    private readonly tatumWebhook;
    private readonly exchangeRateService;
    private readonly logger;
    constructor(walletService: WalletService, tatumWallet: TatumWalletService, tatumWithdrawal: TatumWithdrawalService, tatumRisk: TatumRiskService, tatumWebhook: TatumWebhookService, exchangeRateService: TatumExchangeRateService);
    getWallets(user: User): Promise<{
        balanceInNgn: import("@src/generated/client/runtime/library").Decimal;
        _count: {
            ledgerEntries: number;
        };
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        amount: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        balanceAfter: import("@src/generated/client/runtime/library").Decimal;
    })[]>;
    getExchangeRates(): Promise<{
        rates: Record<string, number>;
        lastUpdated: Date;
        ageMinutes: number;
        source: string;
    }>;
    initWallet(user: User, currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    }>;
    withdrawCrypto(user: User, walletId: string, address: string, amount: number): Promise<{
        success: boolean;
        txId: string;
        status: string;
        message: string;
    }>;
    private hashCode;
}
