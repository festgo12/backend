import { Currency, AdType } from '@prisma/client';
export declare class CreateAdDto {
    asset: Currency;
    type: AdType;
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
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'quantity' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    search?: string;
}
