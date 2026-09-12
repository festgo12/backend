import { GiftCardBrand, GiftCardListingStatus, GiftCardOrderStatus } from '@src/generated/client';
export declare class ListGiftCardListingsDto {
    brand?: GiftCardBrand;
    status?: GiftCardListingStatus;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class ListGiftCardOrdersDto {
    status?: GiftCardOrderStatus;
    search?: string;
    page?: number;
    limit?: number;
}
