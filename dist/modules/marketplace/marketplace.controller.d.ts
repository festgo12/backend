import { MarketplaceService } from './marketplace.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
export declare class MarketplaceController {
    private readonly marketplaceService;
    constructor(marketplaceService: MarketplaceService);
    searchAds(dto: SearchAdsDto): Promise<{
        items: {
            seller: {
                totalOrders: number;
                completionRate: number;
                profile: {
                    firstName: string | null;
                    kycStatus: string;
                } | null;
                id: string;
                devices: {
                    lastLogin: Date;
                }[];
            };
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.AdType;
            sellerId: string;
            version: number;
            asset: import("@src/generated/client").$Enums.Currency;
            price: import("@src/generated/client/runtime/library").Decimal;
            quantity: import("@src/generated/client/runtime/library").Decimal;
            minLimit: import("@src/generated/client/runtime/library").Decimal;
            maxLimit: import("@src/generated/client/runtime/library").Decimal;
            isSponsored: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createAd(req: any, dto: CreateAdDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    listMyAds(req: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }[]>;
    updateAd(req: any, id: string, dto: UpdateAdDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(req: any, id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    getSellerStats(id: string): Promise<{
        totalOrders: number;
        completedOrders: number;
        completionRate: number;
    }>;
}
