import { GiftCardStoreService } from './gift-card-store.service';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { CreateStoreBrandDto } from './dto/create-store-brand.dto';
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
            ngnPerUsd: number;
            indicativePriceUsd: number | null;
            indicativePriceNgn: import("@src/generated/client/runtime/library").Decimal;
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
    getBrands(): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        brandName: string;
        logoUrl: string | null;
        backgroundColor: string | null;
        providerBrandId: string;
    })[]>;
    createBrand(dto: CreateStoreBrandDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        brandName: string;
        logoUrl: string | null;
        backgroundColor: string | null;
        providerBrandId: string;
    }>;
    createProduct(dto: CreateStoreProductDto): Promise<{
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            brandName: string;
            logoUrl: string | null;
            backgroundColor: string | null;
            providerBrandId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        currencyCode: string;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        markupPercent: import("@src/generated/client/runtime/library").Decimal;
        productName: string;
        countryCode: string;
        fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
        minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        senderFee: import("@src/generated/client/runtime/library").Decimal;
        providerProductId: string;
        brandId: string | null;
        discountPercentage: import("@src/generated/client/runtime/library").Decimal;
        providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        lastSyncedAt: Date | null;
    }>;
    updateProduct(id: string, dto: UpdateStoreProductDto): Promise<{
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            brandName: string;
            logoUrl: string | null;
            backgroundColor: string | null;
            providerBrandId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        currencyCode: string;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        markupPercent: import("@src/generated/client/runtime/library").Decimal;
        productName: string;
        countryCode: string;
        fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
        minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
        senderFee: import("@src/generated/client/runtime/library").Decimal;
        providerProductId: string;
        brandId: string | null;
        discountPercentage: import("@src/generated/client/runtime/library").Decimal;
        providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        lastSyncedAt: Date | null;
    }>;
    deleteProduct(id: string): Promise<{
        deleted: boolean;
        id: string;
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
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                    providerBrandId: string;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                enabled: boolean;
                currencyCode: string;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                productName: string;
                countryCode: string;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                providerProductId: string;
                brandId: string | null;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                lastSyncedAt: Date | null;
            };
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
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
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
                providerBrandId: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            currencyCode: string;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            markupPercent: import("@src/generated/client/runtime/library").Decimal;
            productName: string;
            countryCode: string;
            fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
            minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
            senderFee: import("@src/generated/client/runtime/library").Decimal;
            providerProductId: string;
            brandId: string | null;
            discountPercentage: import("@src/generated/client/runtime/library").Decimal;
            providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            lastSyncedAt: Date | null;
        };
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        version: number;
        quantity: number;
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
