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
const ledger_service_1 = require("../wallet/ledger.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("../../generated/client/index.js");
const giftbit_client_1 = require("./giftbit.client");
const wallet_query_util_1 = require("../wallet/wallet-query.util");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const stream_1 = require("stream");
const DEFAULT_NGN_PER_USD = 1550;
const PENDING_ORDER_SWEEP_MS = 5 * 60 * 1000;
const PENDING_ORDER_STARTUP_DELAY_MS = 10 * 1000;
const PENDING_ORDER_SWEEP_BATCH = 50;
let GiftCardStoreService = GiftCardStoreService_1 = class GiftCardStoreService {
    prisma;
    ledgerService;
    exchangeRateService;
    eventEmitter;
    giftbit;
    httpService;
    logger = new common_1.Logger(GiftCardStoreService_1.name);
    pollTimer;
    constructor(prisma, ledgerService, exchangeRateService, eventEmitter, giftbit, httpService) {
        this.prisma = prisma;
        this.ledgerService = ledgerService;
        this.exchangeRateService = exchangeRateService;
        this.eventEmitter = eventEmitter;
        this.giftbit = giftbit;
        this.httpService = httpService;
    }
    onModuleInit() {
        if (!this.giftbit.isConfigured()) {
            this.logger.warn('Giftbit is not configured; skipping pending-order resolution poller.');
            void this.ensureCatalogSeeded();
            return;
        }
        this.pollTimer = setInterval(() => {
            void this.sweepPendingOrders();
        }, PENDING_ORDER_SWEEP_MS);
        setTimeout(() => {
            void this.sweepPendingOrders();
        }, PENDING_ORDER_STARTUP_DELAY_MS);
        this.logger.log(`Giftbit configured for ${this.giftbit.getEnvironment()}; pending-order poller started.`);
        void this.ensureCatalogSynced();
    }
    onModuleDestroy() {
        if (this.pollTimer)
            clearInterval(this.pollTimer);
    }
    async syncCatalog() {
        if (!this.giftbit.isConfigured()) {
            throw new common_1.BadRequestException('Giftbit is not configured. Set GIFTBIT_ENV and the matching GIFTBIT_*_API_TOKEN.');
        }
        const ngnPerUsd = this.ngnPerUsd();
        const limit = 100;
        let offset = 0;
        let totalCount = Number.POSITIVE_INFINITY;
        let guard = 0;
        let syncedBrands = 0;
        let syncedProducts = 0;
        while (offset < totalCount && guard < 100) {
            guard += 1;
            const page = await this.giftbit.listBrands({
                currencyisocode: 'USD',
                embeddable: true,
                limit,
                offset,
            });
            const brands = page?.brands || [];
            if (!brands.length)
                break;
            for (const brand of brands) {
                const detail = await this.giftbit
                    .getBrand(brand.brand_code)
                    .catch(() => null);
                await this.upsertBrand(brand, detail);
                await this.upsertProduct(brand, detail, ngnPerUsd);
                syncedBrands += 1;
                syncedProducts += 1;
            }
            totalCount = page?.total_count ?? offset + brands.length;
            offset += brands.length;
        }
        this.logger.log(`Giftbit catalog sync complete: ${syncedProducts} products, ${syncedBrands} brands (USD, embeddable)`);
        return {
            syncedProducts,
            syncedBrands,
            currency: 'USD',
            lastSyncedAt: new Date(),
        };
    }
    async upsertBrand(brand, detail) {
        const providerBrandId = brand?.brand_code;
        if (!providerBrandId)
            return false;
        const existing = await this.prisma.giftCardStoreBrand.findUnique({
            where: { providerBrandId },
        });
        await this.prisma.giftCardStoreBrand.upsert({
            where: { providerBrandId },
            update: {
                brandName: detail?.name || brand?.name || existing?.brandName || providerBrandId,
                logoUrl: brand?.image_url || existing?.logoUrl,
            },
            create: {
                providerBrandId,
                brandName: detail?.name || brand?.name || providerBrandId,
                logoUrl: brand?.image_url || null,
            },
        });
        return true;
    }
    async upsertProduct(brand, detail, ngnPerUsd) {
        const providerProductId = brand?.brand_code;
        if (!providerProductId)
            return;
        const brandRow = await this.prisma.giftCardStoreBrand.findUnique({
            where: { providerBrandId: providerProductId },
        });
        const brandId = brandRow?.id || null;
        const variablePrice = Boolean(detail?.variable_price);
        const denominationType = variablePrice
            ? client_1.GiftCardDenominationType.RANGE
            : client_1.GiftCardDenominationType.FIXED;
        const fixedDenominations = Array.isArray(detail?.allowed_prices_in_cents)
            ? detail.allowed_prices_in_cents.map((cents) => cents / 100)
            : [];
        const minDenomination = variablePrice && detail?.min_price_in_cents != null
            ? new client_1.Prisma.Decimal(detail.min_price_in_cents).div(100)
            : null;
        const maxDenomination = variablePrice && detail?.max_price_in_cents != null
            ? new client_1.Prisma.Decimal(detail.max_price_in_cents).div(100)
            : null;
        const firstDenomination = fixedDenominations.length > 0
            ? Number(fixedDenominations[0])
            : minDenomination
                ? minDenomination.toNumber()
                : maxDenomination
                    ? maxDenomination.toNumber()
                    : 5;
        const indicativeNgn = new client_1.Prisma.Decimal(firstDenomination).mul(ngnPerUsd);
        await this.prisma.giftCardStoreProduct.upsert({
            where: { providerProductId },
            update: {
                productName: detail?.name || brand?.name || providerProductId,
                brandId,
                denominationType,
                fixedDenominations: fixedDenominations.length
                    ? fixedDenominations
                    : undefined,
                minDenomination,
                maxDenomination,
                providerPriceNgn: indicativeNgn,
                providerResponse: this.toJson({
                    raw: brand,
                    detail,
                    syncedAt: new Date().toISOString(),
                }),
                lastSyncedAt: new Date(),
            },
            create: {
                providerProductId,
                productName: detail?.name || brand?.name || providerProductId,
                brandId,
                countryCode: 'US',
                currencyCode: 'USD',
                denominationType,
                fixedDenominations: fixedDenominations.length
                    ? fixedDenominations
                    : undefined,
                minDenomination,
                maxDenomination,
                senderFee: new client_1.Prisma.Decimal(0),
                discountPercentage: new client_1.Prisma.Decimal(0),
                providerPriceNgn: indicativeNgn,
                enabled: this.autoEnableNewProducts(),
                markupPercent: new client_1.Prisma.Decimal(0),
                providerResponse: this.toJson({
                    raw: brand,
                    detail,
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
    async proxyBrandImage(url) {
        let parsed;
        try {
            parsed = new URL(url);
        }
        catch {
            throw new common_1.BadRequestException('Invalid image URL');
        }
        const allowedHosts = [
            'uploadedimagestestbed.giftbit.com',
            'uploadedimages.giftbit.com',
        ];
        if (!allowedHosts.includes(parsed.hostname) || parsed.protocol !== 'https:') {
            throw new common_1.BadRequestException('Image host not allowed');
        }
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(parsed.toString(), {
            responseType: 'stream',
            timeout: 15000,
        }));
        const axiosRes = response;
        const stream = new stream_1.PassThrough();
        axiosRes.data.pipe(stream);
        return {
            stream,
            contentType: String(axiosRes.headers['content-type'] || 'image/png'),
            contentLength: axiosRes.headers['content-length']?.toString(),
            cacheControl: 'public, max-age=86400',
        };
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
        let providerResp = null;
        try {
            providerResp = await this.giftbit.createEmbedded({
                brand_code: product.providerProductId,
                price_in_cents: Math.round(Number(dto.amount) * 100),
                id: order.id,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Gift card store order ${order.id} provider failure: ${message}`);
            await this.failOrder(order.id, message, null);
            throw new common_1.BadRequestException(`Gift card order failed: ${message}. Your funds have been refunded.`);
        }
        const infoCode = providerResp?.info?.code;
        const campaign = providerResp?.campaign;
        const giftLink = providerResp?.gift_link || null;
        const providerOrderId = campaign?.uuid || null;
        const providerGiftUuid = giftLink ? this.giftUuidFromLink(giftLink) : null;
        await this.prisma.giftCardStoreOrder.update({
            where: { id: order.id },
            data: {
                providerOrderId,
                providerGiftUuid,
                giftLink,
                providerResponse: this.toJson(providerResp),
            },
        });
        const awaitingFunds = infoCode === giftbit_client_1.GIFTBIT_INFO_FUNDS_REQUIRED ||
            infoCode === giftbit_client_1.GIFTBIT_INFO_FUNDS_PENDING;
        if (awaitingFunds) {
            this.eventEmitter.emit('gift-card-store.order.pending', {
                order: {
                    id: order.id,
                    userId: order.userId,
                    sellPriceNgn: order.sellPriceNgn.toString(),
                },
            });
            return this.buildOrderResponse(order.id, {
                pending: true,
                message: 'Order placed. Your claim link will appear here as soon as Giftbit funds settle.',
            });
        }
        return this.completeOrder(order.id, {
            giftLink,
            providerGiftUuid,
            providerResponse: providerResp,
        });
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
    async sweepPendingOrders() {
        if (!this.giftbit.isConfigured())
            return;
        const orders = await this.prisma.giftCardStoreOrder.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: PENDING_ORDER_SWEEP_BATCH,
            select: { id: true },
        });
        for (const { id } of orders) {
            try {
                await this.resolveOrder(id);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Giftbit pending-order resolution failed for ${id}: ${message}`);
            }
        }
    }
    async resolveOrder(orderId) {
        const order = await this.prisma.giftCardStoreOrder.findFirst({
            where: { id: orderId },
            include: { product: { include: { brand: true } } },
        });
        if (!order) {
            this.logger.warn(`No gift card store order matched ${orderId}`);
            return { matched: false, orderId: null };
        }
        if (order.status !== 'PENDING') {
            return { matched: true, orderId: order.id, alreadyFinalized: true };
        }
        if (!order.providerGiftUuid && !order.providerOrderId) {
            return this.retryCreateEmbedded(order);
        }
        let gift = null;
        if (order.providerGiftUuid) {
            const res = await this.giftbit
                .getGift(order.providerGiftUuid)
                .catch(() => null);
            gift = res?.gift || null;
        }
        else if (order.providerOrderId) {
            const res = await this.giftbit
                .listGifts({ campaignUuid: order.providerOrderId, limit: 1 })
                .catch(() => null);
            gift = res?.gifts?.[0] || null;
        }
        if (!gift) {
            return { matched: true, orderId: order.id, pending: true };
        }
        const status = String(gift.status || '').toUpperCase();
        if (status === 'SENT_AND_REDEEMABLE' || status === 'REDEEMED') {
            const giftLink = order.giftLink || this.deriveEmbeddedLink(gift.uuid);
            return this.completeOrder(order.id, {
                giftLink,
                providerGiftUuid: gift.uuid,
                providerResponse: gift,
            }).then(() => ({
                matched: true,
                orderId: order.id,
                delivered: true,
                gift,
            }));
        }
        return { matched: true, orderId: order.id, pending: true };
    }
    async retryCreateEmbedded(order) {
        const priceInCents = Math.round(Number(order.denomination) * 100);
        let providerResp = null;
        try {
            providerResp = await this.giftbit.createEmbedded({
                brand_code: order.product.providerProductId,
                price_in_cents: priceInCents,
                id: order.id,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Crash-window retry createEmbedded failed for order ${order.id}: ${message}`);
            await this.failOrder(order.id, message, null);
            return {
                matched: true,
                orderId: order.id,
                failed: true,
                message,
            };
        }
        const infoCode = providerResp?.info?.code;
        const campaign = providerResp?.campaign;
        const giftLink = providerResp?.gift_link || null;
        const providerOrderId = campaign?.uuid || null;
        const providerGiftUuid = giftLink ? this.giftUuidFromLink(giftLink) : null;
        await this.prisma.giftCardStoreOrder.update({
            where: { id: order.id },
            data: {
                providerOrderId,
                providerGiftUuid,
                giftLink,
                providerResponse: this.toJson(providerResp),
            },
        });
        const awaitingFunds = infoCode === giftbit_client_1.GIFTBIT_INFO_FUNDS_REQUIRED ||
            infoCode === giftbit_client_1.GIFTBIT_INFO_FUNDS_PENDING;
        if (awaitingFunds) {
            this.eventEmitter.emit('gift-card-store.order.pending', {
                order: {
                    id: order.id,
                    userId: order.userId,
                    sellPriceNgn: order.sellPriceNgn.toString(),
                },
            });
            return {
                matched: true,
                orderId: order.id,
                pending: true,
                message: 'Crash-window retry: order is pending Giftbit funds settlement.',
            };
        }
        return this.completeOrder(order.id, {
            giftLink,
            providerGiftUuid,
            providerResponse: providerResp,
        }).then((result) => ({
            matched: true,
            orderId: order.id,
            delivered: true,
            gift: providerResp,
        }));
    }
    async completeOrder(orderId, fields) {
        const order = await this.prisma.giftCardStoreOrder.update({
            where: { id: orderId },
            data: {
                status: 'COMPLETED',
                giftLink: fields.giftLink ?? undefined,
                providerGiftUuid: fields.providerGiftUuid ?? undefined,
                providerResponse: fields.providerResponse
                    ? this.toJson(fields.providerResponse)
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
            giftLink: order.giftLink,
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
    async getStoreConfig() {
        const configured = this.giftbit.isConfigured();
        const funds = configured
            ? await this.giftbit.getFunds().catch(() => null)
            : null;
        const usdFunds = funds?.fundsbycurrency?.USD || null;
        return {
            provider: 'giftbit',
            configured,
            environment: configured ? this.giftbit.getEnvironment() : null,
            fundsUsd: usdFunds
                ? {
                    available: usdFunds.available_in_cents / 100,
                    pending: usdFunds.pending_in_cents / 100,
                    reserved: usdFunds.reserved_in_cents / 100,
                }
                : null,
        };
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
        if (dto.denominationType === client_1.GiftCardDenominationType.FIXED &&
            (!dto.fixedDenominations || dto.fixedDenominations.length === 0) &&
            (!product.fixedDenominations ||
                product.fixedDenominations.length === 0)) {
            throw new common_1.BadRequestException('FIXED products require at least one fixed denomination');
        }
        if (dto.denominationType === client_1.GiftCardDenominationType.RANGE &&
            dto.minDenomination === undefined &&
            dto.maxDenomination === undefined &&
            !product.minDenomination) {
            throw new common_1.BadRequestException('RANGE products require a minimum denomination');
        }
        const nextDenominationType = dto.denominationType ?? product.denominationType;
        const indicativeDenomination = dto.fixedDenominations && dto.fixedDenominations.length > 0
            ? dto.fixedDenominations[0]
            : dto.minDenomination ?? product.minDenomination?.toNumber() ?? 5;
        const indicativeNgn = new client_1.Prisma.Decimal(indicativeDenomination).mul(this.ngnPerUsd());
        return this.prisma.giftCardStoreProduct.update({
            where: { id: productId },
            data: {
                ...(dto.enabled !== undefined && { enabled: dto.enabled }),
                ...(dto.markupPercent !== undefined && {
                    markupPercent: new client_1.Prisma.Decimal(dto.markupPercent),
                }),
                ...(dto.productName !== undefined && {
                    productName: dto.productName,
                }),
                ...(dto.countryCode !== undefined && {
                    countryCode: dto.countryCode,
                }),
                ...(dto.denominationType !== undefined && {
                    denominationType: dto.denominationType,
                }),
                ...(dto.fixedDenominations !== undefined && {
                    fixedDenominations: dto.fixedDenominations,
                }),
                ...(dto.minDenomination !== undefined && {
                    minDenomination: new client_1.Prisma.Decimal(dto.minDenomination),
                }),
                ...(dto.maxDenomination !== undefined && {
                    maxDenomination: new client_1.Prisma.Decimal(dto.maxDenomination),
                }),
                ...(dto.senderFee !== undefined && {
                    senderFee: new client_1.Prisma.Decimal(dto.senderFee),
                }),
                providerPriceNgn: indicativeNgn,
            },
            include: { brand: true },
        });
    }
    async deleteProduct(productId) {
        const product = await this.prisma.giftCardStoreProduct.findUnique({
            where: { id: productId },
            include: { _count: { select: { orders: true } } },
        });
        if (!product)
            throw new common_1.NotFoundException('Gift card product not found');
        if (product._count.orders > 0) {
            throw new common_1.ConflictException('This product has orders and cannot be deleted. Disable it instead.');
        }
        await this.prisma.giftCardStoreProduct.delete({
            where: { id: productId },
        });
        return { deleted: true, id: productId };
    }
    async getAllBrandsAdmin() {
        return this.prisma.giftCardStoreBrand.findMany({
            orderBy: { brandName: 'asc' },
            include: { _count: { select: { products: true } } },
        });
    }
    async createBrand(dto) {
        const slug = dto.brandName
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const providerBrandId = `CUSTOM-${slug || 'BRAND'}`;
        const existing = await this.prisma.giftCardStoreBrand.findUnique({
            where: { providerBrandId },
        });
        if (existing) {
            throw new common_1.ConflictException(`A brand named "${dto.brandName}" already exists`);
        }
        return this.prisma.giftCardStoreBrand.create({
            data: {
                providerBrandId,
                brandName: dto.brandName.trim(),
                logoUrl: dto.logoUrl || null,
                backgroundColor: dto.backgroundColor || null,
            },
        });
    }
    async createProduct(dto) {
        const existing = await this.prisma.giftCardStoreProduct.findUnique({
            where: { providerProductId: dto.providerProductId },
        });
        if (existing) {
            throw new common_1.ConflictException('A product with this Giftbit brand code already exists. Edit it instead.');
        }
        if (dto.denominationType === client_1.GiftCardDenominationType.FIXED) {
            if (!dto.fixedDenominations || dto.fixedDenominations.length === 0) {
                throw new common_1.BadRequestException('FIXED products require at least one fixed denomination');
            }
        }
        if (dto.denominationType === client_1.GiftCardDenominationType.RANGE) {
            if (dto.minDenomination === undefined) {
                throw new common_1.BadRequestException('RANGE products require a minimum denomination');
            }
            if (dto.maxDenomination !== undefined &&
                dto.maxDenomination <= dto.minDenomination) {
                throw new common_1.BadRequestException('Maximum denomination must be greater than the minimum');
            }
        }
        let brandId = dto.brandId || null;
        if (brandId) {
            const brand = await this.prisma.giftCardStoreBrand.findUnique({
                where: { id: brandId },
            });
            if (!brand)
                throw new common_1.BadRequestException('Selected brand not found');
        }
        const indicativeDenomination = dto.denominationType === client_1.GiftCardDenominationType.FIXED
            ? dto.fixedDenominations[0]
            : dto.minDenomination ?? 5;
        const indicativeNgn = new client_1.Prisma.Decimal(indicativeDenomination).mul(this.ngnPerUsd());
        return this.prisma.giftCardStoreProduct.create({
            data: {
                providerProductId: dto.providerProductId,
                productName: dto.productName,
                brandId,
                countryCode: dto.countryCode || 'US',
                currencyCode: dto.currencyCode || 'USD',
                denominationType: dto.denominationType,
                ...(dto.fixedDenominations && {
                    fixedDenominations: dto.fixedDenominations,
                }),
                ...(dto.minDenomination !== undefined && {
                    minDenomination: new client_1.Prisma.Decimal(dto.minDenomination),
                }),
                ...(dto.maxDenomination !== undefined && {
                    maxDenomination: new client_1.Prisma.Decimal(dto.maxDenomination),
                }),
                senderFee: new client_1.Prisma.Decimal(dto.senderFee ?? 0),
                discountPercentage: new client_1.Prisma.Decimal(0),
                providerPriceNgn: indicativeNgn,
                enabled: false,
                markupPercent: new client_1.Prisma.Decimal(dto.markupPercent ?? 5),
                providerResponse: this.toJson({
                    source: 'admin',
                    createdAt: new Date().toISOString(),
                    ...(dto.providerResponse || {}),
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
        return this.formatOrderForAdmin(order);
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
            currency: 'USD',
        };
    }
    autoEnableNewProducts() {
        return process.env.GIFTBIT_AUTO_ENABLE !== 'false';
    }
    async ensureCatalogSynced() {
        try {
            const count = await this.prisma.giftCardStoreProduct.count();
            if (count > 0)
                return;
            this.logger.log('Gift card store catalog is empty; syncing from Giftbit...');
            const result = await this.syncCatalog();
            this.logger.log(`Initial Giftbit catalog sync complete: ${result.syncedProducts} products.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Initial Giftbit catalog sync failed: ${message}`);
        }
    }
    async ensureCatalogSeeded() {
        if (process.env.NODE_ENV === 'production')
            return;
        const demoCatalog = [
            {
                providerBrandId: 'DEMO-AMAZON',
                brandName: 'Amazon',
                productName: 'Amazon Gift Card',
                fixedDenominations: [10, 25, 50, 100],
            },
            {
                providerBrandId: 'DEMO-APPLE',
                brandName: 'Apple',
                productName: 'Apple & iTunes Gift Card',
                fixedDenominations: [10, 25, 50, 100],
            },
            {
                providerBrandId: 'DEMO-STEAM',
                brandName: 'Steam',
                productName: 'Steam Wallet Card',
                fixedDenominations: [20, 50, 100],
            },
            {
                providerBrandId: 'DEMO-GOOGLE-PLAY',
                brandName: 'Google Play',
                productName: 'Google Play Gift Card',
                fixedDenominations: [10, 25, 50],
            },
        ];
        try {
            const count = await this.prisma.giftCardStoreProduct.count();
            if (count > 0)
                return;
            const ngnPerUsd = DEFAULT_NGN_PER_USD;
            for (const entry of demoCatalog) {
                const brand = await this.prisma.giftCardStoreBrand.upsert({
                    where: { providerBrandId: entry.providerBrandId },
                    update: {},
                    create: {
                        providerBrandId: entry.providerBrandId,
                        brandName: entry.brandName,
                    },
                });
                await this.prisma.giftCardStoreProduct.upsert({
                    where: { providerProductId: entry.providerBrandId },
                    update: {},
                    create: {
                        providerProductId: entry.providerBrandId,
                        productName: entry.productName,
                        brandId: brand.id,
                        countryCode: 'US',
                        currencyCode: 'USD',
                        denominationType: client_1.GiftCardDenominationType.FIXED,
                        fixedDenominations: entry.fixedDenominations,
                        senderFee: new client_1.Prisma.Decimal(0),
                        discountPercentage: new client_1.Prisma.Decimal(0),
                        providerPriceNgn: new client_1.Prisma.Decimal(entry.fixedDenominations[0]).mul(ngnPerUsd),
                        enabled: true,
                        markupPercent: new client_1.Prisma.Decimal(0),
                        providerResponse: this.toJson({
                            demo: true,
                            seededAt: new Date().toISOString(),
                        }),
                        lastSyncedAt: new Date(),
                    },
                });
            }
            this.logger.log(`Giftbit not configured; seeded ${demoCatalog.length} demo gift card products (non-production).`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Demo catalog seed failed: ${message}`);
        }
    }
    ngnPerUsd() {
        const rates = this.exchangeRateService.getAllRates();
        const usdt = Number(rates['USDT']);
        return usdt > 0 ? usdt : DEFAULT_NGN_PER_USD;
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
        const unit = new client_1.Prisma.Decimal(amount).mul(ngnPerUsd);
        const fee = new client_1.Prisma.Decimal(Number(product.senderFee || 0)).mul(ngnPerUsd);
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
        const ngnPerUsd = this.ngnPerUsd();
        const firstDenomination = Array.isArray(product.fixedDenominations) &&
            product.fixedDenominations.length
            ? Number(product.fixedDenominations[0])
            : product.minDenomination
                ? product.minDenomination.toNumber()
                : null;
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
            ngnPerUsd,
            indicativePriceUsd: firstDenomination,
            indicativePriceNgn: firstDenomination
                ? new client_1.Prisma.Decimal(firstDenomination).mul(ngnPerUsd).toDecimalPlaces(2)
                : product.providerPriceNgn,
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
        const delivered = order.status === 'COMPLETED' && Boolean(order.giftLink);
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
            delivered,
            giftLink: delivered ? order.giftLink : null,
            cardCode: null,
            cardPin: null,
        };
    }
    formatOrderForAdmin(order) {
        return {
            ...order,
            cardCode: null,
            cardPin: null,
        };
    }
    giftUuidFromLink(link) {
        try {
            const parts = new URL(link).pathname.split('/').filter(Boolean);
            return parts[parts.length - 1] || null;
        }
        catch {
            return null;
        }
    }
    deriveEmbeddedLink(uuid) {
        const host = this.giftbit.getEnvironment() === 'testbed'
            ? 'testbedapp.giftbit.com'
            : 'app.giftbit.com';
        return `https://${host}/embeddedRewards/index/${uuid}`;
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
        ledger_service_1.LedgerService,
        exchange_rate_service_1.ExchangeRateService,
        event_emitter_1.EventEmitter2,
        giftbit_client_1.GiftbitClient,
        axios_1.HttpService])
], GiftCardStoreService);
//# sourceMappingURL=gift-card-store.service.js.map