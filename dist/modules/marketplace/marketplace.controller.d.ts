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
            };
        } & {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.AdType;
            version: number;
            sellerId: string;
            asset: import(".prisma/client").$Enums.Currency;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: import("@prisma/client/runtime/library").Decimal;
            minLimit: import("@prisma/client/runtime/library").Decimal;
            maxLimit: import("@prisma/client/runtime/library").Decimal;
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
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.AdType;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    listMyAds(req: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.AdType;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }[]>;
    updateAd(req: any, id: string, dto: UpdateAdDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.AdType;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(req: any, id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.AdType;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
}
