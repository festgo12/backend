import { Currency } from '@src/generated/client';
export declare function chainValuesForCurrency(currency: Currency): string[] | null;
export declare function isFiatCurrency(currency: Currency): boolean;
export declare function primaryWalletWhere(userId: string, currency: Currency): Record<string, unknown>;
