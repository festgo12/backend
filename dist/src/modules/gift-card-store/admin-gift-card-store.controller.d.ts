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
        currency: string;
    }>;
    getConfig(): Promise<{
        provider: string;
        configured: boolean;
        environment: import("./giftbit.client").GiftbitEnvironment | null;
        fundsUsd: {
            available: number;
            pending: number;
            reserved: number;
        } | null;
    }>;
    syncCatalog(): Promise<{
        syncedProducts: number;
        syncedBrands: number;
        currency: string;
        lastSyncedAt: Date;
    }>;
    getAllProducts(dto: ListStoreProductsDto): Promise<{
        data: {
            id: string;
            providerProductId: string;
            productName: string;
            brand: {
                id: string;
                providerBrandId: string;
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
            providerBrandId: string;
            brandName: string;
            logoUrl: string | null;
            backgroundColor: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currencyCode: string;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        providerProductId: string;
        productName: string;
        brandId: string | null;
        countryCode: string;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
        minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        senderFee: import("@src/generated/client/runtime/library").Decimal;
        discountPercentage: import("@src/generated/client/runtime/library").Decimal;
        providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        enabled: boolean;
        markupPercent: import("@src/generated/client/runtime/library").Decimal;
        lastSyncedAt: Date | null;
    }>;
    getAllOrders(dto: ListStoreOrdersDto): Promise<{
        data: {
            cardCode: string | null;
            cardPin: string | null;
            user: {
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
                status: import("@src/generated/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                twoFactorOtpHash: string | null;
                twoFactorOtpExpires: Date | null;
                resetToken: string | null;
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
            };
            product: {
                brand: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    enabled: boolean;
                    providerBrandId: string;
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                currencyCode: string;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                providerProductId: string;
                productName: string;
                brandId: string | null;
                countryCode: string;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                enabled: boolean;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                lastSyncedAt: Date | null;
            };
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            quantity: number;
            userId: string;
            productId: string;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            giftLink: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
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
            status: import("@src/generated/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetToken: string | null;
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
        };
        product: {
            brand: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                enabled: boolean;
                providerBrandId: string;
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currencyCode: string;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
            providerProductId: string;
            productName: string;
            brandId: string | null;
            countryCode: string;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
            minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            senderFee: import("@src/generated/client/runtime/library").Decimal;
            discountPercentage: import("@src/generated/client/runtime/library").Decimal;
            providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            enabled: boolean;
            markupPercent: import("@src/generated/client/runtime/library").Decimal;
            lastSyncedAt: Date | null;
        };
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        quantity: number;
        userId: string;
        productId: string;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        currencyCode: string;
        providerOrderId: string | null;
        providerGiftUuid: string | null;
        giftLink: string | null;
        costNgn: import("@src/generated/client/runtime/library").Decimal;
        sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        feeNgn: import("@src/generated/client/runtime/library").Decimal;
        recipientEmail: string | null;
        failureMessage: string | null;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
    }>;
}
