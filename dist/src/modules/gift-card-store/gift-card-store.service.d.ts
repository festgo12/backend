import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from '../wallet/ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@src/generated/client';
import { GiftbitClient, GiftbitEmbeddedResponse } from './giftbit.client';
import { PurchaseStoreGiftCardDto } from './dto/purchase-store-gift-card.dto';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { HttpService } from '@nestjs/axios';
import { PassThrough } from 'stream';
type StoreProductWithBrand = Prisma.GiftCardStoreProductGetPayload<{
    include: {
        brand: true;
    };
}>;
export interface PriceQuote {
    productId: string;
    providerProductId: string;
    productName: string;
    brand: StoreProductWithBrand['brand'];
    currencyCode: string;
    denomination: number;
    quantity: number;
    ngnPerUsd: number;
    costNgn: Prisma.Decimal;
    markupPercent: Prisma.Decimal;
    feeNgn: Prisma.Decimal;
    sellPriceNgn: Prisma.Decimal;
    balanceAvailable: Prisma.Decimal;
}
export declare class GiftCardStoreService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly ledgerService;
    private readonly exchangeRateService;
    private readonly eventEmitter;
    private readonly giftbit;
    private readonly httpService;
    private readonly logger;
    private pollTimer?;
    constructor(prisma: PrismaService, ledgerService: LedgerService, exchangeRateService: ExchangeRateService, eventEmitter: EventEmitter2, giftbit: GiftbitClient, httpService: HttpService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    syncCatalog(): Promise<{
        syncedProducts: number;
        syncedBrands: number;
        currency: string;
        lastSyncedAt: Date;
    }>;
    private upsertBrand;
    private upsertProduct;
    listProducts(dto: ListStoreProductsDto): Promise<{
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
            fixedDenominations: string | number | true | Prisma.JsonObject | Prisma.JsonArray;
            minDenomination: Prisma.Decimal | null;
            maxDenomination: Prisma.Decimal | null;
            senderFee: Prisma.Decimal;
            discountPercentage: Prisma.Decimal;
            providerPriceNgn: Prisma.Decimal;
            markupPercent: Prisma.Decimal;
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
    getProductById(productId: string): Promise<{
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
        fixedDenominations: string | number | true | Prisma.JsonObject | Prisma.JsonArray;
        minDenomination: Prisma.Decimal | null;
        maxDenomination: Prisma.Decimal | null;
        senderFee: Prisma.Decimal;
        discountPercentage: Prisma.Decimal;
        providerPriceNgn: Prisma.Decimal;
        markupPercent: Prisma.Decimal;
        enabled: boolean;
        lastSyncedAt: Date | null;
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
        providerBrandId: string;
        brandName: string;
        logoUrl: string | null;
        backgroundColor: string | null;
    })[]>;
    proxyBrandImage(url: string): Promise<{
        stream: PassThrough;
        contentType: string;
        contentLength?: string;
        cacheControl: string;
    }>;
    preview(userId: string, dto: PurchaseStoreGiftCardDto): Promise<PriceQuote>;
    purchase(userId: string, dto: PurchaseStoreGiftCardDto): Promise<{
        order: {
            product: {
                id: string;
                productName: string;
                brand: string | null;
                brandLogoUrl: string | null;
                countryCode: string;
            } | null;
            delivered: boolean;
            giftLink: string | null;
            cardCode: null;
            cardPin: null;
            providerResponse: undefined;
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
            productId: string;
            denomination: Prisma.Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            costNgn: Prisma.Decimal;
            sellPriceNgn: Prisma.Decimal;
            feeNgn: Prisma.Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
        };
    }>;
    getMyOrders(userId: string, page?: number, limit?: number): Promise<{
        data: {
            product: {
                id: string;
                productName: string;
                brand: string | null;
                brandLogoUrl: string | null;
                countryCode: string;
            } | null;
            delivered: boolean;
            giftLink: string | null;
            cardCode: null;
            cardPin: null;
            providerResponse: undefined;
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
            productId: string;
            denomination: Prisma.Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            costNgn: Prisma.Decimal;
            sellPriceNgn: Prisma.Decimal;
            feeNgn: Prisma.Decimal;
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
    private sweepPendingOrders;
    resolveOrder(orderId: string): Promise<{
        matched: boolean;
        orderId: string;
        delivered: boolean;
        gift: GiftbitEmbeddedResponse;
    } | {
        matched: boolean;
        orderId: string;
        failed: boolean;
        message: string;
        pending?: undefined;
    } | {
        matched: boolean;
        orderId: string;
        pending: boolean;
        message: string;
        failed?: undefined;
    } | {
        matched: boolean;
        orderId: string;
        delivered: boolean;
        gift: {
            uuid: string;
            status: string;
        };
    } | {
        matched: boolean;
        orderId: null;
        alreadyFinalized?: undefined;
        pending?: undefined;
    } | {
        matched: boolean;
        orderId: string;
        alreadyFinalized: boolean;
        pending?: undefined;
    } | {
        matched: boolean;
        orderId: string;
        pending: boolean;
        alreadyFinalized?: undefined;
    }>;
    private retryCreateEmbedded;
    private completeOrder;
    private failOrder;
    getStoreConfig(): Promise<{
        provider: string;
        configured: boolean;
        environment: import("./giftbit.client").GiftbitEnvironment | null;
        fundsUsd: {
            available: number;
            pending: number;
            reserved: number;
        } | null;
    }>;
    getAllProductsAdmin(dto: ListStoreProductsDto): Promise<{
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
            fixedDenominations: string | number | true | Prisma.JsonObject | Prisma.JsonArray;
            minDenomination: Prisma.Decimal | null;
            maxDenomination: Prisma.Decimal | null;
            senderFee: Prisma.Decimal;
            discountPercentage: Prisma.Decimal;
            providerPriceNgn: Prisma.Decimal;
            markupPercent: Prisma.Decimal;
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
    updateProduct(productId: string, dto: UpdateStoreProductDto): Promise<{
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
        enabled: boolean;
        currencyCode: string;
        providerResponse: Prisma.JsonValue | null;
        denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
        markupPercent: Prisma.Decimal;
        providerProductId: string;
        productName: string;
        brandId: string | null;
        countryCode: string;
        fixedDenominations: Prisma.JsonValue | null;
        minDenomination: Prisma.Decimal | null;
        maxDenomination: Prisma.Decimal | null;
        senderFee: Prisma.Decimal;
        discountPercentage: Prisma.Decimal;
        providerPriceNgn: Prisma.Decimal;
        lastSyncedAt: Date | null;
    }>;
    getAllOrdersAdmin(dto: ListStoreOrdersDto): Promise<{
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
                    providerBrandId: string;
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                enabled: boolean;
                currencyCode: string;
                providerResponse: Prisma.JsonValue | null;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                markupPercent: Prisma.Decimal;
                providerProductId: string;
                productName: string;
                brandId: string | null;
                countryCode: string;
                fixedDenominations: Prisma.JsonValue | null;
                minDenomination: Prisma.Decimal | null;
                maxDenomination: Prisma.Decimal | null;
                senderFee: Prisma.Decimal;
                discountPercentage: Prisma.Decimal;
                providerPriceNgn: Prisma.Decimal;
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
            denomination: Prisma.Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            giftLink: string | null;
            costNgn: Prisma.Decimal;
            sellPriceNgn: Prisma.Decimal;
            feeNgn: Prisma.Decimal;
            recipientEmail: string | null;
            failureMessage: string | null;
            providerResponse: Prisma.JsonValue | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrderDetailAdmin(orderId: string): Promise<{
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
                providerBrandId: string;
                brandName: string;
                logoUrl: string | null;
                backgroundColor: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            currencyCode: string;
            providerResponse: Prisma.JsonValue | null;
            denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
            markupPercent: Prisma.Decimal;
            providerProductId: string;
            productName: string;
            brandId: string | null;
            countryCode: string;
            fixedDenominations: Prisma.JsonValue | null;
            minDenomination: Prisma.Decimal | null;
            maxDenomination: Prisma.Decimal | null;
            senderFee: Prisma.Decimal;
            discountPercentage: Prisma.Decimal;
            providerPriceNgn: Prisma.Decimal;
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
        denomination: Prisma.Decimal;
        currencyCode: string;
        providerOrderId: string | null;
        providerGiftUuid: string | null;
        giftLink: string | null;
        costNgn: Prisma.Decimal;
        sellPriceNgn: Prisma.Decimal;
        feeNgn: Prisma.Decimal;
        recipientEmail: string | null;
        failureMessage: string | null;
        providerResponse: Prisma.JsonValue | null;
    }>;
    getStats(): Promise<{
        totalProducts: number;
        enabledProducts: number;
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        failedOrders: number;
        totalVolumeNgn: number | Prisma.Decimal;
        currency: string;
    }>;
    private autoEnableNewProducts;
    private ensureCatalogSynced;
    private ensureCatalogSeeded;
    private ngnPerUsd;
    private validateDenomination;
    private computeCostNgn;
    private applyMarkup;
    private buildQuote;
    private formatProduct;
    private formatOrderForUser;
    private formatOrderForAdmin;
    private giftUuidFromLink;
    private deriveEmbeddedLink;
    private toJson;
    private buildOrderResponse;
}
export {};
