import { Currency } from '@src/generated/client';
export declare const EVM_WALLET_CHAINS: readonly ["ETH", "BSC", "POLYGON"];
export declare function chainValuesForCurrency(currency: Currency): string[] | null;
export declare function isFiatCurrency(currency: Currency): boolean;
export declare function primaryWalletWhere(userId: string, currency: Currency): Record<string, unknown>;
export declare function chainValuesForCurrencyChain(currency: Currency, chain: string | null | undefined): string[] | null;
export declare function chainWalletWhere(userId: string, currency: Currency, chain: string | null | undefined): Record<string, unknown>;
export declare function resolveChainWallet<T>(walletFindFirst: (where: Record<string, unknown>) => Promise<T | null>, userId: string, currency: Currency, chain: string | null | undefined): Promise<T | null>;
