import { Currency } from '@src/generated/client';
export declare class AdminUpdateAdDto {
    status?: string;
    quantity?: number;
    price?: number;
    minLimit?: number;
    maxLimit?: number;
    paymentMethods?: string[];
    description?: string;
}
export declare class SweepFeeWalletDto {
    address: string;
    amount?: number;
}
export declare class CreditTestFundsDto {
    email: string;
    currency: Currency;
    amount: number;
}
export declare class UpdateFeeConfigDto {
    value: number;
}
