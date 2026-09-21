import { WalletService } from './wallet.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { CryptoRiskService } from '../security/crypto-risk.service';
import { HdWalletService } from '../crypto/hd-wallet.service';
import { DepositAddressRegistry } from '../crypto/deposit-address-registry.service';
import { CryptoWithdrawalService } from '../crypto/crypto-withdrawal.service';
import { Currency } from '@src/generated/client';
import type { User } from '@src/generated/client';
export declare class WalletController {
    private readonly walletService;
    private readonly exchangeRateService;
    private readonly cryptoRisk;
    private readonly hdWallet;
    private readonly depositRegistry;
    private readonly cryptoWithdrawal;
    private readonly logger;
    constructor(walletService: WalletService, exchangeRateService: ExchangeRateService, cryptoRisk: CryptoRiskService, hdWallet: HdWalletService, depositRegistry: DepositAddressRegistry, cryptoWithdrawal: CryptoWithdrawalService);
    getWallets(user: User): Promise<{
        balanceInNgn: import("@src/generated/client/runtime/library").Decimal;
        _count: {
            ledgerEntries: number;
        };
        address: string | null;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        derivationIndex: number | null;
        isFrozen: boolean;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            status: string;
            id: string;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            createdAt: Date;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            resolvedAt: Date | null;
            walletId: string;
        } | null;
    } & {
        id: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        createdAt: Date;
        reference: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
    })[]>;
    getExchangeRates(): {
        rates: Record<string, number>;
        lastUpdated: Date;
        ageMinutes: number;
        source: string;
    };
    getChainDepositTotals(user: User, currency?: string): Promise<{
        currency: import("@src/generated/client").$Enums.Currency;
        totals: Record<string, number>;
    }>;
    initWallet(user: User, currency: Currency, chain?: string): Promise<{
        address: string | null;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        derivationIndex: number | null;
        isFrozen: boolean;
    }>;
    private ensureChainDeposit;
    private ensureMultichainWallet;
    withdrawCrypto(user: User, walletId: string, address: string, amount: number): Promise<{
        success: boolean;
        txId: string;
        status: string;
        message: string;
    }>;
}
