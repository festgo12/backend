"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GiftCardStoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardStoreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const encryption_1 = require("../../core/utils/encryption");
const ledger_service_1 = require("../wallet/ledger.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("../../generated/client/index.js");
const reloadly_client_1 = require("./reloadly.client");
const wallet_query_util_1 = require("../wallet/wallet-query.util");
const DEFAULT_NGN_PER_USD = 1550;
let GiftCardStoreService = GiftCardStoreService_1 = class GiftCardStoreService {
    prisma;
    encryption;
    ledgerService;
    exchangeRateService;
    eventEmitter;
    reloadly;
    logger = new common_1.Logger(GiftCardStoreService_1.name);
    constructor(prisma, encryption, ledgerService, exchangeRateService, eventEmitter, reloadly) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.ledgerService = ledgerService;
        this.exchangeRateService = exchangeRateService;
        this.eventEmitter = eventEmitter;
        this.reloadly = reloadly;
    }
    async syncCatalog(options = {}) {
        if (!this.reloadly.isConfigured()) {
            throw new common_1.BadRequestException('Reloadly is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.');
        }
        const countries = options.countries?.length
            ? options.countries
            : ['NG', 'global'];
        const ngnPerUsd = this.ngnPerUsd();
        let syncedProducts = 0;
        let syncedBrands = 0;
        for (const countryCode of countries) {
            let page = 0;
            let totalPages = 1;
            let guard = 0;
            while (page < totalPages && guard < 50) {
                guard += 1;
                const res = await this.reloadly.getProducts({
                    countryCode,
                    page,
                    size: 100,
                });
                const content = res?.content || [];
                for (const product of content) {
                    await this.upsertProduct(product, countryCode, ngnPerUsd);
                    syncedProducts += 1;
                }
                totalPages = res?.totalPages || totalPages;
                page += 1;
            }
        }
        for (let page = 0; page < 5; page += 1) {
            const res = await this.reloadly.getBrands(page, 100);
            const content = res?.content || [];
            if (!content.length)
                break;
            for (const brand of content) {
                const upserted = await this.upsertBrand(brand);
                if (upserted)
                    syncedBrands += 1;
            }
            if (res?.last)
                break;
        }
        this.logger.log(`Catalog sync complete: ${syncedProducts} products, ${syncedBrands} brands across ${countries.join(', ')}`);
        return {
            syncedProducts,
            syncedBrands,
            countries,
            lastSyncedAt: new Date(),
        };
    }
    async upsertBrand(brand) {
        const providerBrandId = Number(brand?.id);
        if (!providerBrandId)
            return false;
        const logos = brand.logoUrls || [];
        const logoList = Array.isArray(logos) ? logos : [];
        const logoUrl = typeof logos === 'string' ? logos : logoList[0] || null;
        const backgroundColor = logoList.length > 1 ? logoList[1] : logoUrl;
        const existing = await this.prisma.giftCardStoreBrand.findUnique({
            where: { providerBrandId },
        });
        await this.prisma.giftCardStoreBrand.upsert({
            where: { providerBrandId },
            update: {
                brandName: brand?.name || existing?.brandName || `Brand ${providerBrandId}`,
                logoUrl: logoUrl || existing?.logoUrl,
                backgroundColor: backgroundColor || existing?.backgroundColor,
            },
            create: {
                providerBrandId,
                brandName: brand?.name || `Brand ${providerBrandId}`,
                logoUrl,
                backgroundColor,
            },
        });
        return true;
    }
    async upsertProduct(product, countryCode, ngnPerUsd) {
        const providerProductId = Number(product?.productId);
        if (!providerProductId)
            return;
        let brandId = null;
        if (product?.brand?.id) {
            const brand = await this.prisma.giftCardStoreBrand.upsert({
                where: { providerBrandId: Number(product.brand.id) },
                update: { brandName: product.brand.name },
                create: {
                    providerBrandId: Number(product.brand.id),
                    brandName: product.brand.name || `Brand ${product.brand.id}`,
                },
            });
            brandId = brand.id;
        }
        const denominationType = this.mapDenominationType(product?.denominationType);
        const sendersCurrency = (product?.senderCurrencyCode || 'USD').toUpperCase();
        const senderNgn = this.usdToNgnThrough(sendersCurrency, ngnPerUsd);
        const senderFeeNgn = Number(product?.senderFee || 0) * senderNgn;
        const firstDenomination = this.firstDenomination(product);
        const indicativeNgn = senderNgn * firstDenomination + senderFeeNgn;
        await this.prisma.giftCardStoreProduct.upsert({
            where: { providerProductId },
            update: {
                productName: product?.productName,
                brandId,
                countryCode,
                currencyCode: (product?.receiverCurrencyCode || 'USD').toUpperCase(),
                denominationType,
                fixedDenominations: product?.fixedRecipientDenominations
                    ? product.fixedRecipientDenominations
                    : undefined,
                minDenomination: product?.minRecipientDenomination
                    ? new client_1.Prisma.Decimal(product.minRecipientDenomination)
                    : null,
                maxDenomination: product?.maxRecipientDenomination
                    ? new client_1.Prisma.Decimal(product.maxRecipientDenomination)
                    : null,
                senderFee: new client_1.Prisma.Decimal(Number(product?.senderFee || 0)),
                discountPercentage: new client_1.Prisma.Decimal(Number(product?.discountPercentage || 0)),
                providerPriceNgn: new client_1.Prisma.Decimal(indicativeNgn),
                providerResponse: this.toJson({
                    raw: product,
                    syncedAt: new Date().toISOString(),
                }),
                lastSyncedAt: new Date(),
            },
            create: {
                providerProductId,
                productName: product?.productName || `Product ${providerProductId}`,
                brandId,
                countryCode,
                currencyCode: (product?.receiverCurrencyCode || 'USD').toUpperCase(),
                denominationType,
                fixedDenominations: product?.fixedRecipientDenominations
                    ? product.fixedRecipientDenominations
                    : undefined,
                minDenomination: product?.minRecipientDenomination
                    ? new client_1.Prisma.Decimal(product.minRecipientDenomination)
                    : null,
                maxDenomination: product?.maxRecipientDenomination
                    ? new client_1.Prisma.Decimal(product.maxRecipientDenomination)
                    : null,
                senderFee: new client_1.Prisma.Decimal(Number(product?.senderFee || 0)),
                discountPercentage: new client_1.Prisma.Decimal(Number(product?.discountPercentage || 0)),
                providerPriceNgn: new client_1.Prisma.Decimal(indicativeNgn),
                enabled: false,
                markupPercent: new client_1.Prisma.Decimal(0),
                providerResponse: this.toJson({
                    raw: product,
                    syncedAt: new Date().toISOString(),
                }),
                lastSyncedAt: new Date(),
            },
        });
    }
    async listProducts(dto) {
        const where = { enabled: true };
        if (dto.brand) {
            where.brand = { brandName: { contains: dto.brand, mode: 'insensitive' } };
        }
        if (dto.search) {
            where.OR = [
                { productName: { contains: dto.search, mode: 'insensitive' } },
                { brand: { brandName: { contains: dto.search, mode: 'insensitive' } } },
            ];
        }
        if (dto.denominationType) {
            where.denominationType = dto.denominationType;
        }
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            this.prisma.giftCardStoreProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: { brand: true },
            }),
            this.prisma.giftCardStoreProduct.count({ where }),
        ]);
        return {
            data: products.map((p) => this.formatProduct(p)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getProductById(productId) {
        const product = await this.prisma.giftCardStoreProduct.findUnique({
            where: { id: productId },
            include: { brand: true },
        });
        if (!product || !product.enabled) {
            throw new common_1.NotFoundException('Gift card product not found');
        }
        return this.formatProduct(product);
    }
    async getBrands() {
        return this.prisma.giftCardStoreBrand.findMany({
            where: { enabled: true },
            orderBy: { brandName: 'asc' },
            include: {
                _count: { select: { products: { where: { enabled: true } } } },
            },
        });
    }
    async preview(userId, dto) {
        const product = await this.prisma.giftCardStoreProduct.findUnique({
            where: { id: dto.productId },
            include: { brand: true },
        });
        if (!product)
            throw new common_1.NotFoundException('Gift card product not found');
        if (!product.enabled)
            throw new common_1.ConflictException('This product is no longer available');
        this.validateDenomination(product, dto.amount);
        const ngnPerUsd = this.ngnPerUsd();
        const costNgn = this.computeCostNgn(product, dto.amount, dto.quantity || 1, ngnPerUsd);
        const sellPriceNgn = this.applyMarkup(costNgn, product.markupPercent);
        const wallet = await this.prisma.wallet.findFirst({
            where: (0, wallet_query_util_1.primaryWalletWhere)(userId, client_1.Currency.NGN),
            select: { balance: true },
        });
        return this.buildQuote(product, dto, ngnPerUsd, costNgn, sellPriceNgn, wallet?.balance);
    }
    async purchase(userId, dto) {
        const quantity = dto.quantity || 1;
        const product = await this.prisma.giftCardStoreProduct.findUnique({
            where: { id: dto.productId },
        });
        if (!product)
            throw new common_1.NotFoundException('Gift card product not found');
        if (!product.enabled)
            throw new common_1.ConflictException('This product is no longer available');
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const recipientEmail = user.email || '';
        if (!recipientEmail) {
            throw new common_1.BadRequestException('A verified email is required to buy gift cards.');
        }
        this.validateDenomination(product, dto.amount);
        const ngnPerUsd = this.ngnPerUsd();
        const costNgn = this.computeCostNgn(product, dto.amount, quantity, ngnPerUsd);
        const sellPriceNgn = this.applyMarkup(costNgn, product.markupPercent);
        const order = await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findFirst({
                where: (0, wallet_query_util_1.primaryWalletWhere)(userId, client_1.Currency.NGN),
            });
            if (!wallet) {
                throw new common_1.BadRequestException('NGN wallet not found. Please fund your wallet first.');
            }
            if (new client_1.Prisma.Decimal(wallet.balance).lessThan(sellPriceNgn)) {
                throw new common_1.ConflictException(`Insufficient balance. Required ₦${sellPriceNgn.toFixed(2)}, available ₦${new client_1.Prisma.Decimal(wallet.balance).toFixed(2)}`);
            }
            const created = await tx.giftCardStoreOrder.create({
                data: {
                    userId,
                    productId: product.id,
                    denomination: new client_1.Prisma.Decimal(dto.amount),
                    currencyCode: product.currencyCode,
                    quantity,
                    status: 'PENDING',
                    costNgn,
                    sellPriceNgn,
                    feeNgn: sellPriceNgn.minus(costNgn),
                    recipientEmail,
                },
            });
            await this.ledgerService.createEntry(tx, {
                walletId: wallet.id,
                amount: -sellPriceNgn.toNumber(),
                type: 'GIFT_CARD_STORE_PURCHASE',
                reference: `GC-STORE-${created.id}`,
                metadata: {
                    orderId: created.id,
                    productId: product.id,
                    providerProductId: product.providerProductId,
                },
            });
            return created;
        });
        let providerTransactionId = null;
        try {
            const senderName = [user.profile?.firstName, user.profile?.lastName]
                .filter(Boolean)
                .join(' ') ||
                (user.email ?? '');
            const providerResp = await this.reloadly.createOrder({
                productId: product.providerProductId,
                quantity,
                unitPrice: Number(dto.amount),
                customIdentifier: order.id,
                recipientEmail,
                senderName,
                countryCode: product.countryCode,
                promoCode: dto.promoCode,
            });
            providerTransactionId =
                providerResp?.transactionId ||
                    providerResp?.customIdentifier ||
                    order.id;
            await this.prisma.giftCardStoreOrder.update({
                where: { id: order.id },
                data: {
                    providerOrderId: providerTransactionId,
                    providerResponse: this.toJson(providerResp),
                },
            });
            const cards = providerTransactionId
                ? await this.reloadly.getCards(providerTransactionId).catch(() => null)
                : null;
            const { giftCard } = cards || {};
            if (giftCard && giftCard.code) {
                return this.finalizeOrder(order.id, giftCard, providerResp);
            }
            this.eventEmitter.emit('gift-card-store.order.pending', {
                order: {
                    id: order.id,
                    userId: order.userId,
                    sellPriceNgn: order.sellPriceNgn.toString(),
                },
            });
            return this.buildOrderResponse(order.id, {
                pending: true,
                message: 'Order placed. Your card code will appear here as soon as the provider delivers it.',
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Gift card store order ${order.id} provider failure: ${message}`);
            await this.failOrder(order.id, message, providerTransactionId);
            throw new common_1.BadRequestException(`Gift card order failed: ${message}. Your funds have been refunded.`);
        }
    }
    async getMyOrders(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.prisma.giftCardStoreOrder.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { product: { include: { brand: true } } },
            }),
            this.prisma.giftCardStoreOrder.count({ where: { userId } }),
        ]);
        return {
            data: orders.map((o) => this.formatOrderForUser(o)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async resolveOrder(payload) {
        const data = payload?.data;
        const identifier = data?.customIdentifier ||
            data?.transactionId ||
            data?.reference ||
            data?.giftCard?.transactionId;
        if (!identifier) {
            this.logger.warn('Reloadly webhook received without an order identifier');
            return { matched: false, orderId: null };
        }
        const order = await this.prisma.giftCardStoreOrder.findFirst({
            where: {
                OR: [{ id: identifier }, { providerOrderId: identifier }],
            },
            include: { product: true, user: true },
        });
        if (!order) {
            this.logger.warn(`No gift card store order matched webhook identifier ${identifier}`);
            return { matched: false, orderId: null, order };
        }
        if (order.status === 'COMPLETED') {
            return {
                matched: true,
                orderId: order.id,
                order,
                alreadyFinalized: true,
            };
        }
        const status = String(data?.status || '').toUpperCase();
        if (status.includes('FAILED') || data?.errorCode) {
            await this.failOrder(order.id, data?.message || data?.errorCode || 'Provider order failed', order.providerOrderId);
            return { matched: true, orderId: order.id, order, failed: true };
        }
        if (order.providerOrderId) {
            const cards = await this.reloadly
                .getCards(order.providerOrderId)
                .catch(() => null);
            const { giftCard } = cards || {};
            if (giftCard && giftCard.code) {
                await this.finalizeOrder(order.id, giftCard, data);
                return { matched: true, orderId: order.id, order, delivered: true };
            }
        }
        return { matched: true, orderId: order.id, order, pending: true };
    }
    async finalizeOrder(orderId, giftCard, providerResponse) {
        const encryptedCode = this.encryption.encrypt(String(giftCard.code));
        const encryptedPin = giftCard.pin
            ? this.encryption.encrypt(String(giftCard.pin))
            : null;
        const order = await this.prisma.giftCardStoreOrder.update({
            where: { id: orderId },
            data: {
                status: 'COMPLETED',
                cardCode: encryptedCode,
                cardPin: encryptedPin,
                providerResponse: providerResponse
                    ? this.toJson(providerResponse)
                    : undefined,
                version: { increment: 1 },
            },
            include: { user: true, product: true },
        });
        this.eventEmitter.emit('gift-card-store.order.completed', {
            order: {
                id: order.id,
                userId: order.userId,
                productName: order.product.productName,
                amount: order.sellPriceNgn.toString(),
            },
        });
        this.logger.log(`Gift card store order completed: ${orderId}`);
        return this.buildOrderResponse(orderId, {
            status: 'COMPLETED',
            cardCode: this.encryption.decrypt(encryptedCode),
            cardPin: encryptedPin ? this.encryption.decrypt(encryptedPin) : null,
        });
    }
    async failOrder(orderId, message, providerOrderId) {
        const order = await this.prisma.giftCardStoreOrder.findUnique({
            where: { id: orderId },
        });
        if (!order || order.status === 'FAILED' || order.status === 'REFUNDED') {
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            const updated = await tx.giftCardStoreOrder.update({
                where: { id: orderId },
                data: {
                    status: 'FAILED',
                    failureMessage: message,
                    providerOrderId: providerOrderId || order.providerOrderId,
                    version: { increment: 1 },
                },
            });
            const wallet = await tx.wallet.findFirst({
                where: (0, wallet_query_util_1.primaryWalletWhere)(order.userId, client_1.Currency.NGN),
            });
            if (wallet) {
                await this.ledgerService.createEntry(tx, {
                    walletId: wallet.id,
                    amount: updated.sellPriceNgn.toNumber(),
                    type: 'GIFT_CARD_STORE_REFUND',
                    reference: `GC-STORE-REFUND-${orderId}`,
                    metadata: { orderId, reason: message },
                });
            }
        });
        this.eventEmitter.emit('gift-card-store.order.failed', {
            order: { id: orderId, userId: order.userId, message },
        });
        this.logger.log(`Gift card store order failed + refunded: ${orderId}`);
    }
    async getAllProductsAdmin(dto) {
        const where = {};
        if (dto.brand) {
            where.brand = { brandName: { contains: dto.brand, mode: 'insensitive' } };
        }
        if (dto.search) {
            where.OR = [
                { productName: { contains: dto.search, mode: 'insensitive' } },
            ];
        }
        if (dto.denominationType)
            where.denominationType = dto.denominationType;
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            this.prisma.giftCardStoreProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: { brand: true },
            }),
            this.prisma.giftCardStoreProduct.count({ where }),
        ]);
        return {
            data: products.map((p) => this.formatProduct(p)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async updateProduct(productId, dto) {
        const product = await this.prisma.giftCardStoreProduct.findUnique({
            where: { id: productId },
        });
        if (!product)
            throw new common_1.NotFoundException('Gift card product not found');
        return this.prisma.giftCardStoreProduct.update({
            where: { id: productId },
            data: {
                ...(dto.enabled !== undefined && { enabled: dto.enabled }),
                ...(dto.markupPercent !== undefined && {
                    markupPercent: new client_1.Prisma.Decimal(dto.markupPercent),
                }),
            },
            include: { brand: true },
        });
    }
    async getAllOrdersAdmin(dto) {
        const where = {};
        if (dto.status)
            where.status = dto.status;
        if (dto.search) {
            where.OR = [
                { user: { email: { contains: dto.search, mode: 'insensitive' } } },
                {
                    product: {
                        productName: { contains: dto.search, mode: 'insensitive' },
                    },
                },
            ];
        }
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.prisma.giftCardStoreOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { include: { profile: true } },
                    product: { include: { brand: true } },
                },
            }),
            this.prisma.giftCardStoreOrder.count({ where }),
        ]);
        return {
            data: orders.map((o) => this.formatOrderForAdmin(o)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getOrderDetailAdmin(orderId) {
        const order = await this.prisma.giftCardStoreOrder.findUnique({
            where: { id: orderId },
            include: {
                user: { include: { profile: true } },
                product: { include: { brand: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Gift card store order not found');
        const formatted = this.formatOrderForAdmin(order);
        if (order.cardCode) {
            formatted.cardCode = this.encryption.decrypt(order.cardCode);
        }
        if (order.cardPin) {
            formatted.cardPin = this.encryption.decrypt(order.cardPin);
        }
        return formatted;
    }
    async getStats() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalProducts, enabledProducts, totalOrders, pendingOrders, completedOrders, failedOrders, volumeResult,] = await Promise.all([
            this.prisma.giftCardStoreProduct.count(),
            this.prisma.giftCardStoreProduct.count({ where: { enabled: true } }),
            this.prisma.giftCardStoreOrder.count(),
            this.prisma.giftCardStoreOrder.count({ where: { status: 'PENDING' } }),
            this.prisma.giftCardStoreOrder.count({ where: { status: 'COMPLETED' } }),
            this.prisma.giftCardStoreOrder.count({ where: { status: 'FAILED' } }),
            this.prisma.giftCardStoreOrder.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
                _sum: { sellPriceNgn: true },
            }),
        ]);
        return {
            totalProducts,
            enabledProducts,
            totalOrders,
            pendingOrders,
            completedOrders,
            failedOrders,
            totalVolumeNgn: volumeResult._sum.sellPriceNgn || 0,
        };
    }
    ngnPerUsd() {
        const rates = this.exchangeRateService.getAllRates();
        const usdt = Number(rates['USDT']);
        return usdt > 0 ? usdt : DEFAULT_NGN_PER_USD;
    }
    usdToNgnThrough(currency, ngnPerUsd) {
        if (currency === 'NGN')
            return 1;
        return ngnPerUsd;
    }
    mapDenominationType(type) {
        switch (String(type || '').toUpperCase()) {
            case 'FIXED':
                return client_1.GiftCardDenominationType.FIXED;
            case 'RANGE':
                return client_1.GiftCardDenominationType.RANGE;
            default:
                return client_1.GiftCardDenominationType.OPEN;
        }
    }
    firstDenomination(product) {
        if (Array.isArray(product?.fixedRecipientDenominations) &&
            product.fixedRecipientDenominations.length) {
            return Number(product.fixedRecipientDenominations[0]);
        }
        return (Number(product?.minRecipientDenomination || 0) ||
            Number(product?.maxRecipientDenomination || 5) ||
            5);
    }
    validateDenomination(product, amount) {
        const amt = new client_1.Prisma.Decimal(amount);
        if (Array.isArray(product.fixedDenominations) &&
            product.fixedDenominations.length) {
            const allowed = product.fixedDenominations.some((d) => new client_1.Prisma.Decimal(Number(d)).minus(amt).abs().lessThanOrEqualTo(0.01));
            if (!allowed) {
                throw new common_1.BadRequestException(`Invalid denomination. Available: ${product.fixedDenominations.join(', ')} ${product.currencyCode}`);
            }
            return;
        }
        if (product.minDenomination && amt.lessThan(product.minDenomination)) {
            throw new common_1.BadRequestException(`Minimum denomination is ${product.minDenomination.toString()} ${product.currencyCode}`);
        }
        if (product.maxDenomination && amt.greaterThan(product.maxDenomination)) {
            throw new common_1.BadRequestException(`Maximum denomination is ${product.maxDenomination.toString()} ${product.currencyCode}`);
        }
    }
    computeCostNgn(product, amount, quantity, ngnPerUsd) {
        const senderNgn = this.usdToNgnThrough(product.currencyCode, ngnPerUsd);
        const unit = new client_1.Prisma.Decimal(amount).mul(senderNgn);
        const fee = new client_1.Prisma.Decimal(Number(product.senderFee || 0)).mul(senderNgn);
        return unit.plus(fee).mul(quantity);
    }
    applyMarkup(costNgn, markupPercent) {
        if (!markupPercent || markupPercent.isZero()) {
            return costNgn.toDecimalPlaces(2);
        }
        return costNgn
            .mul(new client_1.Prisma.Decimal(1).plus(markupPercent.div(100)))
            .toDecimalPlaces(2);
    }
    buildQuote(product, dto, ngnPerUsd, costNgn, sellPriceNgn, balanceAvailable) {
        return {
            productId: product.id,
            providerProductId: product.providerProductId,
            productName: product.productName,
            brand: product.brand,
            currencyCode: product.currencyCode,
            denomination: dto.amount,
            quantity: dto.quantity || 1,
            ngnPerUsd,
            costNgn,
            markupPercent: product.markupPercent,
            feeNgn: sellPriceNgn.minus(costNgn),
            sellPriceNgn,
            balanceAvailable: balanceAvailable || new client_1.Prisma.Decimal(0),
        };
    }
    formatProduct(product) {
        return {
            id: product.id,
            providerProductId: product.providerProductId,
            productName: product.productName,
            brand: product.brand
                ? {
                    id: product.brand.id,
                    providerBrandId: product.brand.providerBrandId,
                    brandName: product.brand.brandName,
                    logoUrl: product.brand.logoUrl,
                    backgroundColor: product.brand.backgroundColor,
                }
                : null,
            countryCode: product.countryCode,
            currencyCode: product.currencyCode,
            denominationType: product.denominationType,
            fixedDenominations: product.fixedDenominations || [],
            minDenomination: product.minDenomination,
            maxDenomination: product.maxDenomination,
            senderFee: product.senderFee,
            discountPercentage: product.discountPercentage,
            providerPriceNgn: product.providerPriceNgn,
            markupPercent: product.markupPercent,
            enabled: product.enabled,
            lastSyncedAt: product.lastSyncedAt,
        };
    }
    formatOrderForUser(order) {
        const safe = {
            ...order,
            cardCode: undefined,
            cardPin: undefined,
            providerResponse: undefined,
        };
        return {
            ...safe,
            product: order.product
                ? {
                    id: order.product.id,
                    productName: order.product.productName,
                    brand: order.product.brand?.brandName || null,
                    brandLogoUrl: order.product.brand?.logoUrl || null,
                    countryCode: order.product.countryCode,
                }
                : null,
            cardCode: order.status === 'COMPLETED' && order.cardCode
                ? this.encryption.decrypt(order.cardCode)
                : null,
            cardPin: order.status === 'COMPLETED' && order.cardPin
                ? this.encryption.decrypt(order.cardPin)
                : null,
        };
    }
    formatOrderForAdmin(order) {
        return {
            ...order,
            cardCode: null,
            cardPin: null,
        };
    }
    toJson(value) {
        return value;
    }
    async buildOrderResponse(orderId, extra) {
        const order = await this.prisma.giftCardStoreOrder.findUnique({
            where: { id: orderId },
            include: { product: { include: { brand: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return {
            order: this.formatOrderForUser(order),
            ...extra,
        };
    }
};
exports.GiftCardStoreService = GiftCardStoreService;
exports.GiftCardStoreService = GiftCardStoreService = GiftCardStoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_1.EncryptionService,
        ledger_service_1.LedgerService,
        exchange_rate_service_1.ExchangeRateService,
        event_emitter_1.EventEmitter2,
        reloadly_client_1.ReloadlyClient])
], GiftCardStoreService);
//# sourceMappingURL=gift-card-store.service.js.map