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
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
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
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
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
            sellerId: string;
            buyerId: string;
            version: number;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            cardCurrency: string;
            askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
            listingId: string;
        })[];
        moderator: ({
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
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
        sellerId: string;
        version: number;
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
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
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
        sellerId: string;
        version: number;
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
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
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
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
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
                sellerId: string;
                version: number;
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
            sellerId: string;
            buyerId: string;
            version: number;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            cardCurrency: string;
            askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
            listingId: string;
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
            sellerId: string;
            version: number;
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
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
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
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
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
        sellerId: string;
        buyerId: string;
        version: number;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        cardCurrency: string;
        askingPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        totalPaidNgn: import("@src/generated/client/runtime/library").Decimal;
        listingId: string;
    }>;
}
