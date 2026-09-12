import { GiftCardDenominationType } from '@src/generated/client';
export declare class ListStoreProductsDto {
    brand?: string;
    search?: string;
    denominationType?: GiftCardDenominationType;
    page?: number;
    limit?: number;
}
