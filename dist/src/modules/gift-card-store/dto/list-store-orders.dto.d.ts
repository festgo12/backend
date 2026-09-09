import { GiftCardStoreOrderStatus } from '@src/generated/client';
export declare class ListStoreOrdersDto {
    status?: GiftCardStoreOrderStatus;
    search?: string;
    page?: number;
    limit?: number;
}
