import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
import { Decimal } from '@src/generated/client/runtime/library';
import { UploadService } from '../upload/upload.service';
export declare class MarketplaceService {
    private prisma;
    private readonly uploadService;
    constructor(prisma: PrismaService, uploadService: UploadService);
    createAd(userId: string, dto: CreateAdDto): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        chain: string | null;
        asset: import("@src/generated/client").$Enums.Currency;
        quantity: Decimal;
        price: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    private isSingleChainAsset;
    updateAd(userId: string, adId: string, dto: UpdateAdDto): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        chain: string | null;
        asset: import("@src/generated/client").$Enums.Currency;
        quantity: Decimal;
        price: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    deleteAd(userId: string, adId: string): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        chain: string | null;
        asset: import("@src/generated/client").$Enums.Currency;
        quantity: Decimal;
        price: Decimal;
        minLimit: Decimal;
        maxLimit: Decimal;
        isSponsored: boolean;
    }>;
    listUserAds(userId: string): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        chain: string | null;
        asset: import("@src/generated/client").$Enums.Currency;
        quantity: Decimal;
        price: Decimal;
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
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                    kycStatus: string;
                } | null;
                totalOrders: number;
                completionRate: number;
                id: string;
                devices: {
                    lastLogin: Date;
                    lastActivity: Date | null;
                }[];
            };
            type: import("@src/generated/client").$Enums.AdType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            sellerId: string;
            version: number;
            chain: string | null;
            asset: import("@src/generated/client").$Enums.Currency;
            quantity: Decimal;
            price: Decimal;
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
