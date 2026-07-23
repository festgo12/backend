import { GiftCardService } from './gift-card.service';
import { ModerateGiftCardListingDto } from './dto/moderate-listing.dto';
import { ListGiftCardListingsDto, ListGiftCardOrdersDto } from './dto/list-listings.dto';
export declare class AdminGiftCardController {
    private readonly giftCardService;
    constructor(giftCardService: GiftCardService);
    getStats(): Promise<{
        totalListings: number;
        pendingReview: number;
        activeListings: number;
        totalOrders: number;
        completedOrders: number;
        totalVolumeNgn: number | import("@src/generated/client/runtime/library").Decimal;
    }>;
    getAllListings(dto: ListGiftCardListingsDto): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getListingDetail(id: string): Promise<{
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
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            cardCurrency: string;
            askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            listingId: string;
            totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
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
        denomination: import("@src/generated/client/runtime/library").Decimal;
        cardCurrency: string;
        exchangeRate: import("@src/generated/client/runtime/library").Decimal;
        askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        evidenceUrls: import("@src/generated/client/runtime/library").JsonValue | null;
        moderatorNote: string | null;
        moderatorId: string | null;
    }>;
    moderateListing(req: any, id: string, dto: ModerateGiftCardListingDto): Promise<{
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
        denomination: import("@src/generated/client/runtime/library").Decimal;
        cardCurrency: string;
        exchangeRate: import("@src/generated/client/runtime/library").Decimal;
        askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        evidenceUrls: import("@src/generated/client/runtime/library").JsonValue | null;
        moderatorNote: string | null;
        moderatorId: string | null;
    }>;
    getAllOrders(dto: ListGiftCardOrdersDto): Promise<{
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
                denomination: import("@src/generated/client/runtime/library").Decimal;
                cardCurrency: string;
                exchangeRate: import("@src/generated/client/runtime/library").Decimal;
                askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                evidenceUrls: import("@src/generated/client/runtime/library").JsonValue | null;
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
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            cardCurrency: string;
            askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            listingId: string;
            totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrderDetail(id: string): Promise<{
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
            denomination: import("@src/generated/client/runtime/library").Decimal;
            cardCurrency: string;
            exchangeRate: import("@src/generated/client/runtime/library").Decimal;
            askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            evidenceUrls: import("@src/generated/client/runtime/library").JsonValue | null;
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
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        cardCurrency: string;
        askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        listingId: string;
        totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
    }>;
}
