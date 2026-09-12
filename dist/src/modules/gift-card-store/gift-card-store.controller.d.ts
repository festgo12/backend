import { Request as ExpressRequest } from 'express';
import { GiftCardStoreService } from './gift-card-store.service';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { PurchaseStoreGiftCardDto } from './dto/purchase-store-gift-card.dto';
interface AuthenticatedRequest extends ExpressRequest {
    user: {
        id: string;
        [key: string]: unknown;
    };
}
export declare class GiftCardStoreController {
    private readonly storeService;
    constructor(storeService: GiftCardStoreService);
    getBrands(): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        providerBrandId: string;
        brandName: string;
        logoUrl: string | null;
        backgroundColor: string | null;
    })[]>;
    getProducts(dto: ListStoreProductsDto): Promise<{
        data: {
            id: string;
            providerProductId: string;
            productName: string;
            brand: {
                id: string;
                providerBrandId: string;
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
            } | null;
            countryCode: string;
            currencyCode: string;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            fixedDenominations: string | number | true | import("@src/generated/client/runtime/library").JsonObject | import("@src/generated/client/runtime/library").JsonArray;
            minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            senderFee: import("@src/generated/client/runtime/library").Decimal;
            discountPercentage: import("@src/generated/client/runtime/library").Decimal;
            providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            markupPercent: import("@src/generated/client/runtime/library").Decimal;
            enabled: boolean;
            lastSyncedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getProduct(id: string): Promise<{
        id: string;
        providerProductId: string;
        productName: string;
        brand: {
            id: string;
            providerBrandId: string;
            brandName: string;
            logoUrl: string | null;
            backgroundColor: string | null;
        } | null;
        countryCode: string;
        currencyCode: string;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        fixedDenominations: string | number | true | import("@src/generated/client/runtime/library").JsonObject | import("@src/generated/client/runtime/library").JsonArray;
        minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        senderFee: import("@src/generated/client/runtime/library").Decimal;
        discountPercentage: import("@src/generated/client/runtime/library").Decimal;
        providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        markupPercent: import("@src/generated/client/runtime/library").Decimal;
        enabled: boolean;
        lastSyncedAt: Date | null;
    }>;
    preview(req: AuthenticatedRequest, dto: PurchaseStoreGiftCardDto): Promise<import("./gift-card-store.service").PriceQuote>;
    purchase(req: AuthenticatedRequest, dto: PurchaseStoreGiftCardDto): Promise<{
        order: {
            product: {
                id: string;
                productName: string;
                brand: string | null;
                brandLogoUrl: string | null;
                countryCode: string;
            } | null;
            delivered: boolean;
            giftLink: string | null;
            cardCode: null;
            cardPin: null;
            providerResponse: undefined;
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
            productId: string;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
        };
    }>;
    getMyOrders(req: AuthenticatedRequest, page?: number, limit?: number): Promise<{
        data: {
            product: {
                id: string;
                productName: string;
                brand: string | null;
                brandLogoUrl: string | null;
                countryCode: string;
            } | null;
            delivered: boolean;
            giftLink: string | null;
            cardCode: null;
            cardPin: null;
            providerResponse: undefined;
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
            productId: string;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
export {};
