import { Currency, AdType } from '@src/generated/client';
export declare const AD_CHAINS: readonly ["ETH", "BSC", "POLYGON", "SOLANA", "TRON"];
export declare class CreateAdDto {
    asset: Currency;
    type: AdType;
    chain?: string;
    price: number;
    quantity: number;
    minLimit: number;
    maxLimit: number;
    isSponsored?: boolean;
}
export declare class UpdateAdDto {
    price?: number;
    quantity?: number;
    minLimit?: number;
    maxLimit?: number;
    isSponsored?: boolean;
    status?: string;
}
export declare class SearchAdsDto {
    asset?: Currency;
    type?: AdType;
    minPrice?: number;
    maxPrice?: number;
    isSponsored?: boolean;
    chain?: string;
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'quantity' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    search?: string;
}
