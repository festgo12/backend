import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
import { Decimal } from '@src/generated/client/runtime/library';
export declare class MarketplaceService {
    private prisma;
    constructor(prisma: PrismaService);
    createAd(userId: string, dto: CreateAdDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Decimal;
        quantity: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    updateAd(userId: string, adId: string, dto: UpdateAdDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Decimal;
        quantity: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(userId: string, adId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Decimal;
        quantity: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    listUserAds(userId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.AdType;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Decimal;
        quantity: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }[]>;
    getSellerStats(sellerId: string): Promise<{
        totalOrders: number;
        completedOrders: number;
        completionRate: number;
    }>;
    private getSellerStatsBatch;
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
            price: Decimal;
            quantity: Decimal;
            minLimit: Decimal;
            maxLimit: Decimal;
            isSponsored: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
