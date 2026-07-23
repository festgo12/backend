import { GiftCardService } from './gift-card.service';
import { CreateGiftCardListingDto } from './dto/create-listing.dto';
import { PurchaseGiftCardDto } from './dto/purchase-listing.dto';
import { ListGiftCardListingsDto } from './dto/list-listings.dto';
export declare class GiftCardController {
    private readonly giftCardService;
    constructor(giftCardService: GiftCardService);
    getActiveListings(dto: ListGiftCardListingsDto): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getListingById(id: string): Promise<any>;
    createListing(req: any, dto: CreateGiftCardListingDto): Promise<any>;
    getMyListings(req: any, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    deleteListing(req: any, id: string): Promise<{
        success: boolean;
    }>;
    purchaseListing(req: any, dto: PurchaseGiftCardDto): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        buyerId: string;
        version: number;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        cardCurrency: string;
        askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
        listingId: string;
    }>;
    getMyPurchases(req: any, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMySales(req: any, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    confirmReceipt(req: any, id: string): Promise<any>;
    cancelOrder(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
