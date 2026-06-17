import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
export declare class MarketplaceService {
    private prisma;
    constructor(prisma: PrismaService);
    createAd(userId: string, dto: CreateAdDto): Promise<{
        type: import(".prisma/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    updateAd(userId: string, adId: string, dto: UpdateAdDto): Promise<{
        type: import(".prisma/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(userId: string, adId: string): Promise<{
        type: import(".prisma/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    listUserAds(userId: string): Promise<{
        type: import(".prisma/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        asset: import(".prisma/client").$Enums.Currency;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
    }[]>;
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
            type: import(".prisma/client").$Enums.AdType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
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
}
