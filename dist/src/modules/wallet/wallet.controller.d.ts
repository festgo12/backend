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
        currency: import("@src/generated/client").$Enums.Currency;
        chain: string | null;
        id: string;
        updatedAt: Date;
        userId: string;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        derivationIndex: number | null;
        isFrozen: boolean;
        version: number;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            status: string;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reference: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            fee: import("@src/generated/client/runtime/library").Decimal;
            resolvedAt: Date | null;
        } | null;
    } & {
        walletId: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        reference: string;
        type: import("@src/generated/client").$Enums.LedgerType;
        balanceAfter: import("@src/generated/client/runtime/library").Decimal;
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
        currency: import("@src/generated/client").$Enums.Currency;
        chain: string | null;
        id: string;
        updatedAt: Date;
        userId: string;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        derivationIndex: number | null;
        isFrozen: boolean;
        version: number;
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
