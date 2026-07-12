import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
export declare class MarketplaceService {
    private prisma;
    constructor(prisma: PrismaService);
    createAd(userId: string, dto: CreateAdDto): Promise<{
        id: string;
        asset: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.AdType;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
    }>;
    updateAd(userId: string, adId: string, dto: UpdateAdDto): Promise<{
        id: string;
        asset: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.AdType;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
    }>;
    deleteAd(userId: string, adId: string): Promise<{
        id: string;
        asset: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.AdType;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
    }>;
    listUserAds(userId: string): Promise<{
        id: string;
        asset: import(".prisma/client").$Enums.Currency;
        type: import(".prisma/client").$Enums.AdType;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: import("@prisma/client/runtime/library").Decimal;
        minLimit: import("@prisma/client/runtime/library").Decimal;
        maxLimit: import("@prisma/client/runtime/library").Decimal;
        isSponsored: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
    }[]>;
    searchAds(dto: SearchAdsDto): Promise<{
        items: ({
            seller: {
                id: string;
                profile: {
                    firstName: string | null;
                    kycStatus: string;
                } | null;
                devices: {
                    lastLogin: Date;
                }[];
            };
        } & {
            id: string;
            asset: import(".prisma/client").$Enums.Currency;
            type: import(".prisma/client").$Enums.AdType;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: import("@prisma/client/runtime/library").Decimal;
            minLimit: import("@prisma/client/runtime/library").Decimal;
            maxLimit: import("@prisma/client/runtime/library").Decimal;
            isSponsored: boolean;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
