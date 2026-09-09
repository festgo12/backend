import { GiftCardStoreService } from './gift-card-store.service';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
export declare class AdminGiftCardStoreController {
    private readonly storeService;
    constructor(storeService: GiftCardStoreService);
    getStats(): Promise<{
        totalProducts: number;
        enabledProducts: number;
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        failedOrders: number;
        totalVolumeNgn: number | import("@src/generated/client/runtime/library").Decimal;
    }>;
    syncCatalog(body?: {
        countries?: string[];
    }): Promise<{
        syncedProducts: number;
        syncedBrands: number;
        countries: string[];
        lastSyncedAt: Date;
    }>;
    getAllProducts(dto: ListStoreProductsDto): Promise<{
        data: {
            id: string;
            providerProductId: number;
            productName: string;
            brand: {
                id: string;
                providerBrandId: number;
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
            } | null;
            countryCode: string;
            currencyCode: string;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            fixedDenominations: string | number | true | import("@src/generated/client/runtime/library").JsonObject | import("@src/generated/client/runtime/library").JsonArray;
            minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            senderFee: import("@src/generated/client/runtime/library").Decimal;
            discountPercentage: import("@src/generated/client/runtime/library").Decimal;
            providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            markupPercent: import("@src/generated/client/runtime/library").Decimal;
            enabled: boolean;
            lastSyncedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateProduct(id: string, dto: UpdateStoreProductDto): Promise<{
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            providerBrandId: number;
            brandName: string;
            logoUrl: string | null;
            backgroundColor: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        countryCode: string;
        productName: string;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        markupPercent: import("@src/generated/client/runtime/library").Decimal;
        providerProductId: number;
        brandId: string | null;
        currencyCode: string;
        fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
        minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        senderFee: import("@src/generated/client/runtime/library").Decimal;
        discountPercentage: import("@src/generated/client/runtime/library").Decimal;
        providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        lastSyncedAt: Date | null;
    }>;
    getAllOrders(dto: ListStoreOrdersDto): Promise<{
        data: {
            cardCode: string | null;
            cardPin: string | null;
            user: {
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
                twoFactorOtpHash: string | null;
                twoFactorOtpExpires: Date | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                isSystem: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
            product: {
                brand: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    enabled: boolean;
                    providerBrandId: number;
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                enabled: boolean;
                countryCode: string;
                productName: string;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                providerProductId: number;
                brandId: string | null;
                currencyCode: string;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                lastSyncedAt: Date | null;
            };
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            productId: string;
            currencyCode: string;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
            providerOrderId: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrderDetail(id: string): Promise<{
        cardCode: string | null;
        cardPin: string | null;
        user: {
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
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        product: {
            brand: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                enabled: boolean;
                providerBrandId: number;
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            countryCode: string;
            productName: string;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            markupPercent: import("@src/generated/client/runtime/library").Decimal;
            providerProductId: number;
            brandId: string | null;
            currencyCode: string;
            fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
            minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            senderFee: import("@src/generated/client/runtime/library").Decimal;
            discountPercentage: import("@src/generated/client/runtime/library").Decimal;
            providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
            lastSyncedAt: Date | null;
        };
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        version: number;
        quantity: number;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        productId: string;
        currencyCode: string;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        providerOrderId: string | null;
        costNgn: import("@src/generated/client/runtime/library").Decimal;
        sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        feeNgn: import("@src/generated/client/runtime/library").Decimal;
        recipientEmail: string | null;
        failureMessage: string | null;
    }>;
}
