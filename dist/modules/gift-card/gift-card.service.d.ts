import { PrismaService } from '../../core/database/prisma.service';
import { EncryptionService } from '../../core/utils/encryption';
import { LedgerService } from '../wallet/ledger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@src/generated/client';
import { CreateGiftCardListingDto } from './dto/create-listing.dto';
import { ModerateGiftCardListingDto } from './dto/moderate-listing.dto';
import { PurchaseGiftCardDto } from './dto/purchase-listing.dto';
import { ListGiftCardListingsDto, ListGiftCardOrdersDto } from './dto/list-listings.dto';
export declare class GiftCardService {
    private readonly prisma;
    private readonly encryption;
    private readonly ledgerService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, encryption: EncryptionService, ledgerService: LedgerService, eventEmitter: EventEmitter2);
    createListing(sellerId: string, dto: CreateGiftCardListingDto): Promise<any>;
    getActiveListings(dto: ListGiftCardListingsDto): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getListingById(listingId: string): Promise<any>;
    getMyListings(sellerId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    purchaseListing(buyerId: string, dto: PurchaseGiftCardDto): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        buyerId: string;
        feeAmount: Prisma.Decimal;
        denomination: Prisma.Decimal;
        cardCurrency: string;
        askingPriceNgn: Prisma.Decimal;
        listingId: string;
        totalPaidNgn: Prisma.Decimal;
    }>;
    getMyPurchases(buyerId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMySales(sellerId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    confirmReceipt(buyerId: string, orderId: string): Promise<any>;
    cancelOrder(userId: string, orderId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteListing(sellerId: string, listingId: string): Promise<{
        success: boolean;
    }>;
    getListingAdmin(listingId: string): Promise<{
        cardCode: string;
        cardPin: string | null;
        seller: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        orders: ({
            buyer: {
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    kycStatus: string;
                } | null;
            } & {
                id: string;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
            buyerId: string;
            feeAmount: Prisma.Decimal;
            denomination: Prisma.Decimal;
            cardCurrency: string;
            askingPriceNgn: Prisma.Decimal;
            listingId: string;
            totalPaidNgn: Prisma.Decimal;
        })[];
        moderator: ({
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        evidenceRecords: {
            id: string;
            createdAt: Date;
            fileType: string;
            uploadedBy: string;
            listingId: string;
            fileUrl: string;
        }[];
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardListingStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        brand: import("@src/generated/client").$Enums.GiftCardBrand;
        denomination: Prisma.Decimal;
        cardCurrency: string;
        exchangeRate: Prisma.Decimal;
        askingPriceNgn: Prisma.Decimal;
        evidenceUrls: Prisma.JsonValue | null;
        moderatorNote: string | null;
        moderatorId: string | null;
    }>;
    getAllListingsAdmin(dto: ListGiftCardListingsDto): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    moderateListing(listingId: string, dto: ModerateGiftCardListingDto, moderatorId: string): Promise<{
        seller: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardListingStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        brand: import("@src/generated/client").$Enums.GiftCardBrand;
        cardCode: string;
        cardPin: string | null;
        denomination: Prisma.Decimal;
        cardCurrency: string;
        exchangeRate: Prisma.Decimal;
        askingPriceNgn: Prisma.Decimal;
        evidenceUrls: Prisma.JsonValue | null;
        moderatorNote: string | null;
        moderatorId: string | null;
    }>;
    getAllOrdersAdmin(dto: ListGiftCardOrdersDto): Promise<{
        data: ({
            seller: {
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    kycStatus: string;
                } | null;
            } & {
                id: string;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
            buyer: {
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    kycStatus: string;
                } | null;
            } & {
                id: string;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
            listing: {
                id: string;
                status: import("@src/generated/client").$Enums.GiftCardListingStatus;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
                brand: import("@src/generated/client").$Enums.GiftCardBrand;
                cardCode: string;
                cardPin: string | null;
                denomination: Prisma.Decimal;
                cardCurrency: string;
                exchangeRate: Prisma.Decimal;
                askingPriceNgn: Prisma.Decimal;
                evidenceUrls: Prisma.JsonValue | null;
                moderatorNote: string | null;
                moderatorId: string | null;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
            buyerId: string;
            feeAmount: Prisma.Decimal;
            denomination: Prisma.Decimal;
            cardCurrency: string;
            askingPriceNgn: Prisma.Decimal;
            listingId: string;
            totalPaidNgn: Prisma.Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrderDetailAdmin(orderId: string): Promise<{
        listing: {
            cardCode: string;
            cardPin: string | null;
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardListingStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
            brand: import("@src/generated/client").$Enums.GiftCardBrand;
            denomination: Prisma.Decimal;
            cardCurrency: string;
            exchangeRate: Prisma.Decimal;
            askingPriceNgn: Prisma.Decimal;
            evidenceUrls: Prisma.JsonValue | null;
            moderatorNote: string | null;
            moderatorId: string | null;
        };
        seller: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        buyer: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        sellerId: string;
        buyerId: string;
        feeAmount: Prisma.Decimal;
        denomination: Prisma.Decimal;
        cardCurrency: string;
        askingPriceNgn: Prisma.Decimal;
        listingId: string;
        totalPaidNgn: Prisma.Decimal;
    }>;
    getStats(): Promise<{
        totalListings: number;
        pendingReview: number;
        activeListings: number;
        totalOrders: number;
        completedOrders: number;
        totalVolumeNgn: number | Prisma.Decimal;
    }>;
    private stripSensitive;
    private formatOrderForBuyer;
    private formatOrderForSeller;
}
