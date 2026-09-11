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
        id: string;
        updatedAt: Date;
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }[]>;
    getHistory(user: User, walletId?: string, limit?: number, offset?: number): Promise<({
        wallet: {
            currency: import("@src/generated/client").$Enums.Currency;
        };
        transaction: {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
            resolvedAt: Date | null;
        } | null;
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        orderId: string | null;
        reference: string;
        id: string;
        createdAt: Date;
        amount: import("@src/generated/client/runtime/library").Decimal;
        balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        transactionId: string | null;
    })[]>;
    getExchangeRates(): {
        rates: Record<string, number>;
        lastUpdated: Date;
        ageMinutes: number;
        source: string;
    };
    initWallet(user: User, currency: Currency, chain?: string): Promise<{
        id: string;
        updatedAt: Date;
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }>;
    private ensurePrimaryEvmDeposit;
    private ensureMultichainWallet;
    withdrawCrypto(user: User, walletId: string, address: string, amount: number): Promise<{
        success: boolean;
        txId: string;
        status: string;
        message: string;
    }>;
}
