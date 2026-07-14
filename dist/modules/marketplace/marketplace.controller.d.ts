import { MarketplaceService } from './marketplace.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
export declare class MarketplaceController {
    private readonly marketplaceService;
    constructor(marketplaceService: MarketplaceService);
    searchAds(dto: SearchAdsDto): Promise<{
        items: ({
            seller: {
                profile: {
                    firstName: string | null;
                    kycStatus: string;
                } | null;
                id: string;
                devices: {
                    lastLogin: Date;
                }[];
            };
        } & {
            type: import("@src/generated/client").$Enums.AdType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
            asset: import("@src/generated/client").$Enums.Currency;
            price: import("@src/generated/client/runtime/library").Decimal;
            quantity: import("@src/generated/client/runtime/library").Decimal;
            minLimit: import("@src/generated/client/runtime/library").Decimal;
            maxLimit: import("@src/generated/client/runtime/library").Decimal;
            isSponsored: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createAd(req: any, dto: CreateAdDto): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    listMyAds(req: any): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }[]>;
    updateAd(req: any, id: string, dto: UpdateAdDto): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(req: any, id: string): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
}
