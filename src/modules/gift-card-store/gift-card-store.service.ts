import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from '../wallet/ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  GiftCardStoreProduct,
  GiftCardDenominationType,
  Currency,
} from '@src/generated/client';
import {
  GiftbitClient,
  GiftbitBrand,
  GiftbitBrandDetail,
  GiftbitEmbeddedResponse,
  GIFTBIT_INFO_FUNDS_REQUIRED,
  GIFTBIT_INFO_FUNDS_PENDING,
} from './giftbit.client';
import { PurchaseStoreGiftCardDto } from './dto/purchase-store-gift-card.dto';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { primaryWalletWhere } from '../wallet/wallet-query.util';

const DEFAULT_NGN_PER_USD = 1550;
const PENDING_ORDER_SWEEP_MS = 5 * 60 * 1000;
const PENDING_ORDER_STARTUP_DELAY_MS = 10 * 1000;
const PENDING_ORDER_SWEEP_BATCH = 50;

type StoreProduct = GiftCardStoreProduct;
type StoreProductWithBrand = Prisma.GiftCardStoreProductGetPayload<{
  include: { brand: true };
}>;
type StoreOrderWithProduct = Prisma.GiftCardStoreOrderGetPayload<{
  include: { product: { include: { brand: true } } };
}>;
type StoreOrderWithUserProduct = Prisma.GiftCardStoreOrderGetPayload<{
  include: {
    user: { include: { profile: true } };
    product: { include: { brand: true } };
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

@Injectable()
export class GiftCardStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftCardStoreService.name);

  private pollTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly eventEmitter: EventEmitter2,
    private readonly giftbit: GiftbitClient,
  ) {}

  onModuleInit() {
    if (!this.giftbit.isConfigured()) {
      this.logger.warn(
        'Giftbit is not configured; skipping pending-order resolution poller.',
      );
      return;
    }

    this.pollTimer = setInterval(() => {
      void this.sweepPendingOrders();
    }, PENDING_ORDER_SWEEP_MS);
    setTimeout(() => {
      void this.sweepPendingOrders();
    }, PENDING_ORDER_STARTUP_DELAY_MS);
    this.logger.log(
      `Giftbit configured for ${this.giftbit.getEnvironment()}; pending-order poller started.`,
    );
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CATALOG
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Pulls the embeddable, USD-denominated Giftbit brand catalog and upserts
   * the local cache. New products are added as disabled so the catalog only
   * goes live after admin review.
   */
  async syncCatalog() {
    if (!this.giftbit.isConfigured()) {
      throw new BadRequestException(
        'Giftbit is not configured. Set GIFTBIT_ENV and the matching GIFTBIT_*_API_TOKEN.',
      );
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
      const brands: GiftbitBrand[] = page?.brands || [];
      if (!brands.length) break;

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

    this.logger.log(
      `Giftbit catalog sync complete: ${syncedProducts} products, ${syncedBrands} brands (USD, embeddable)`,
    );

    return {
      syncedProducts,
      syncedBrands,
      currency: 'USD',
      lastSyncedAt: new Date(),
    };
  }

  private async upsertBrand(
    brand: GiftbitBrand,
    detail: GiftbitBrandDetail | null,
  ): Promise<boolean> {
    const providerBrandId = brand?.brand_code;
    if (!providerBrandId) return false;

    const existing = await this.prisma.giftCardStoreBrand.findUnique({
      where: { providerBrandId },
    });

    await this.prisma.giftCardStoreBrand.upsert({
      where: { providerBrandId },
      update: {
        brandName:
          detail?.name || brand?.name || existing?.brandName || providerBrandId,
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

  private async upsertProduct(
    brand: GiftbitBrand,
    detail: GiftbitBrandDetail | null,
    ngnPerUsd: number,
  ): Promise<void> {
    const providerProductId = brand?.brand_code;
    if (!providerProductId) return;

    const brandRow = await this.prisma.giftCardStoreBrand.findUnique({
      where: { providerBrandId: providerProductId },
    });
    const brandId = brandRow?.id || null;

    const variablePrice = Boolean(detail?.variable_price);
    const denominationType = variablePrice
      ? GiftCardDenominationType.RANGE
      : GiftCardDenominationType.FIXED;

    const fixedDenominations = Array.isArray(detail?.allowed_prices_in_cents)
      ? detail.allowed_prices_in_cents.map((cents) => cents / 100)
      : [];
    const minDenomination =
      variablePrice && detail?.min_price_in_cents != null
        ? new Prisma.Decimal(detail.min_price_in_cents).div(100)
        : null;
    const maxDenomination =
      variablePrice && detail?.max_price_in_cents != null
        ? new Prisma.Decimal(detail.max_price_in_cents).div(100)
        : null;

    const firstDenomination =
      fixedDenominations.length > 0
        ? Number(fixedDenominations[0])
        : minDenomination
          ? minDenomination.toNumber()
          : maxDenomination
            ? maxDenomination.toNumber()
            : 5;
    const indicativeNgn = new Prisma.Decimal(firstDenomination).mul(ngnPerUsd);

    await this.prisma.giftCardStoreProduct.upsert({
      where: { providerProductId },
      update: {
        productName: detail?.name || brand?.name || providerProductId,
        brandId,
        denominationType,
        fixedDenominations: fixedDenominations.length
          ? (fixedDenominations as Prisma.InputJsonValue)
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
          ? (fixedDenominations as Prisma.InputJsonValue)
          : undefined,
        minDenomination,
        maxDenomination,
        senderFee: new Prisma.Decimal(0),
        discountPercentage: new Prisma.Decimal(0),
        providerPriceNgn: indicativeNgn,
        enabled: false,
        markupPercent: new Prisma.Decimal(0),
        providerResponse: this.toJson({
          raw: brand,
          detail,
          syncedAt: new Date().toISOString(),
        }),
        lastSyncedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC STORE
  // ═══════════════════════════════════════════════════════════════════════

  async listProducts(dto: ListStoreProductsDto) {
    const where: Prisma.GiftCardStoreProductWhereInput = { enabled: true };

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

  async getProductById(productId: string) {
    const product = await this.prisma.giftCardStoreProduct.findUnique({
      where: { id: productId },
      include: { brand: true },
    });

    if (!product || !product.enabled) {
      throw new NotFoundException('Gift card product not found');
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

  /**
   * Returns a non-mutating price quote for a product+denomination.
   */
  async preview(
    userId: string,
    dto: PurchaseStoreGiftCardDto,
  ): Promise<PriceQuote> {
    const product = await this.prisma.giftCardStoreProduct.findUnique({
      where: { id: dto.productId },
      include: { brand: true },
    });

    if (!product) throw new NotFoundException('Gift card product not found');
    if (!product.enabled)
      throw new ConflictException('This product is no longer available');

    this.validateDenomination(product, dto.amount);

    const ngnPerUsd = this.ngnPerUsd();
    const costNgn = this.computeCostNgn(
      product,
      dto.amount,
      dto.quantity || 1,
      ngnPerUsd,
    );
    const sellPriceNgn = this.applyMarkup(costNgn, product.markupPercent);

    const wallet = await this.prisma.wallet.findFirst({
      where: primaryWalletWhere(userId, Currency.NGN),
      select: { balance: true },
    });

    return this.buildQuote(
      product,
      dto,
      ngnPerUsd,
      costNgn,
      sellPriceNgn,
      wallet?.balance,
    );
  }

  /**
   * Debites the buyer's NGN wallet and creates an embedded Giftbit reward.
   * Delivery is an embedded claim link (giftLink) instead of a raw card code,
   * which Giftbit never exposes to the server.
   */
  async purchase(userId: string, dto: PurchaseStoreGiftCardDto) {
    const quantity = dto.quantity || 1;

    const product = await this.prisma.giftCardStoreProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Gift card product not found');
    if (!product.enabled)
      throw new ConflictException('This product is no longer available');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const recipientEmail = user.email || '';
    if (!recipientEmail) {
      throw new BadRequestException(
        'A verified email is required to buy gift cards.',
      );
    }

    this.validateDenomination(product, dto.amount);

    const ngnPerUsd = this.ngnPerUsd();
    const costNgn = this.computeCostNgn(
      product,
      dto.amount,
      quantity,
      ngnPerUsd,
    );
    const sellPriceNgn = this.applyMarkup(costNgn, product.markupPercent);

    // 1. Create PENDING order + debit wallet atomically.
    const order = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: primaryWalletWhere(userId, Currency.NGN),
      });
      if (!wallet) {
        throw new BadRequestException(
          'NGN wallet not found. Please fund your wallet first.',
        );
      }

      if (new Prisma.Decimal(wallet.balance).lessThan(sellPriceNgn)) {
        throw new ConflictException(
          `Insufficient balance. Required ₦${sellPriceNgn.toFixed(2)}, available ₦${new Prisma.Decimal(wallet.balance).toFixed(2)}`,
        );
      }

      const created = await tx.giftCardStoreOrder.create({
        data: {
          userId,
          productId: product.id,
          denomination: new Prisma.Decimal(dto.amount),
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

    // 2. Create the embedded Giftbit reward outside the DB transaction.
    let providerResp: GiftbitEmbeddedResponse | null = null;
    try {
      providerResp = await this.giftbit.createEmbedded({
        brand_code: product.providerProductId,
        price_in_cents: Math.round(Number(dto.amount) * 100),
        id: order.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Gift card store order ${order.id} provider failure: ${message}`,
      );
      await this.failOrder(order.id, message, null);
      throw new BadRequestException(
        `Gift card order failed: ${message}. Your funds have been refunded.`,
      );
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

    const awaitingFunds =
      infoCode === GIFTBIT_INFO_FUNDS_REQUIRED ||
      infoCode === GIFTBIT_INFO_FUNDS_PENDING;

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
        message:
          'Order placed. Your claim link will appear here as soon as Giftbit funds settle.',
      });
    }

    return this.completeOrder(order.id, {
      giftLink,
      providerGiftUuid,
      providerResponse: providerResp,
    });
  }

  async getMyOrders(userId: string, page = 1, limit = 20) {
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

  // ═══════════════════════════════════════════════════════════════════════
  // DELIVERY
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Sweeps PENDING orders whose embedded reward may have been created after
   * Giftbit funds settled.
   */
  private async sweepPendingOrders(): Promise<void> {
    if (!this.giftbit.isConfigured()) return;

    const orders = await this.prisma.giftCardStoreOrder.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: PENDING_ORDER_SWEEP_BATCH,
      select: { id: true },
    });

    for (const { id } of orders) {
      try {
        await this.resolveOrder(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Giftbit pending-order resolution failed for ${id}: ${message}`,
        );
      }
    }
  }

  /**
   * Resolves a single PENDING order against Giftbit, completing it once the
   * reward exists and is redeemable.
   *
   * Crash-window recovery: if both providerGiftUuid and providerOrderId are
   * null (the process crashed after the DB debit but before createEmbedded
   * returned), re-invoke createEmbedded with the original order ID. Giftbit's
   * /embedded endpoint is idempotent on the client-supplied `id`, so this is
   * safe — if Giftbit already created the gift it returns the existing record,
   * otherwise it creates a fresh one.
   */
  async resolveOrder(orderId: string) {
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

    // Crash-window recovery: both provider IDs are null — the initial API
    // call never completed. Retry createEmbedded with the idempotency key.
    if (!order.providerGiftUuid && !order.providerOrderId) {
      return this.retryCreateEmbedded(order);
    }

    let gift: { uuid: string; status: string } | null = null;
    if (order.providerGiftUuid) {
      const res = await this.giftbit
        .getGift(order.providerGiftUuid)
        .catch(() => null);
      gift = res?.gift || null;
    } else if (order.providerOrderId) {
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

  /**
   * Re-executes createEmbedded for a PENDING order that never received its
   * provider IDs (crash-window recovery). The Giftbit /embedded endpoint is
   * idempotent on the client-supplied `id`, so re-sending the same order ID
   * is safe.
   *
   * - On success: updates the order with the provider IDs and gift link, then
   *   completes or leaves PENDING depending on the Giftbit info code.
   * - On non-retryable error (invalid brand, insufficient account balance,
   *   out of stock, etc.): fails the order and issues an NGN refund.
   */
  private async retryCreateEmbedded(order: StoreOrderWithProduct) {
    const priceInCents = Math.round(Number(order.denomination) * 100);

    let providerResp: GiftbitEmbeddedResponse | null = null;
    try {
      providerResp = await this.giftbit.createEmbedded({
        brand_code: order.product.providerProductId,
        price_in_cents: priceInCents,
        id: order.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Crash-window retry createEmbedded failed for order ${order.id}: ${message}`,
      );
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

    const awaitingFunds =
      infoCode === GIFTBIT_INFO_FUNDS_REQUIRED ||
      infoCode === GIFTBIT_INFO_FUNDS_PENDING;

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

  private async completeOrder(
    orderId: string,
    fields: {
      giftLink?: string | null;
      providerGiftUuid?: string | null;
      providerResponse?: unknown;
    },
  ) {
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

  private async failOrder(
    orderId: string,
    message: string,
    providerOrderId?: string | null,
  ) {
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
        where: primaryWalletWhere(order.userId, Currency.NGN),
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

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════════════

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

  async getAllProductsAdmin(dto: ListStoreProductsDto) {
    const where: Prisma.GiftCardStoreProductWhereInput = {};

    if (dto.brand) {
      where.brand = { brandName: { contains: dto.brand, mode: 'insensitive' } };
    }
    if (dto.search) {
      where.OR = [
        { productName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.denominationType) where.denominationType = dto.denominationType;

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

  async updateProduct(productId: string, dto: UpdateStoreProductDto) {
    const product = await this.prisma.giftCardStoreProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Gift card product not found');

    return this.prisma.giftCardStoreProduct.update({
      where: { id: productId },
      data: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.markupPercent !== undefined && {
          markupPercent: new Prisma.Decimal(dto.markupPercent),
        }),
      },
      include: { brand: true },
    });
  }

  async getAllOrdersAdmin(dto: ListStoreOrdersDto) {
    const where: Prisma.GiftCardStoreOrderWhereInput = {};

    if (dto.status) where.status = dto.status;
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

  async getOrderDetailAdmin(orderId: string) {
    const order = await this.prisma.giftCardStoreOrder.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { profile: true } },
        product: { include: { brand: true } },
      },
    });

    if (!order) throw new NotFoundException('Gift card store order not found');

    return this.formatOrderForAdmin(order);
  }

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      enabledProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      failedOrders,
      volumeResult,
    ] = await Promise.all([
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

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private ngnPerUsd(): number {
    const rates = this.exchangeRateService.getAllRates();
    const usdt = Number(rates['USDT']);
    return usdt > 0 ? usdt : DEFAULT_NGN_PER_USD;
  }

  private validateDenomination(product: StoreProduct, amount: number): void {
    const amt = new Prisma.Decimal(amount);

    if (
      Array.isArray(product.fixedDenominations) &&
      product.fixedDenominations.length
    ) {
      const allowed = product.fixedDenominations.some((d) =>
        new Prisma.Decimal(Number(d)).minus(amt).abs().lessThanOrEqualTo(0.01),
      );
      if (!allowed) {
        throw new BadRequestException(
          `Invalid denomination. Available: ${product.fixedDenominations.join(', ')} ${product.currencyCode}`,
        );
      }
      return;
    }

    if (product.minDenomination && amt.lessThan(product.minDenomination)) {
      throw new BadRequestException(
        `Minimum denomination is ${product.minDenomination.toString()} ${product.currencyCode}`,
      );
    }
    if (product.maxDenomination && amt.greaterThan(product.maxDenomination)) {
      throw new BadRequestException(
        `Maximum denomination is ${product.maxDenomination.toString()} ${product.currencyCode}`,
      );
    }
  }

  private computeCostNgn(
    product: StoreProduct,
    amount: number,
    quantity: number,
    ngnPerUsd: number,
  ): Prisma.Decimal {
    const unit = new Prisma.Decimal(amount).mul(ngnPerUsd);
    const fee = new Prisma.Decimal(Number(product.senderFee || 0)).mul(
      ngnPerUsd,
    );
    return unit.plus(fee).mul(quantity);
  }

  private applyMarkup(
    costNgn: Prisma.Decimal,
    markupPercent: Prisma.Decimal,
  ): Prisma.Decimal {
    if (!markupPercent || markupPercent.isZero()) {
      return costNgn.toDecimalPlaces(2);
    }
    return costNgn
      .mul(new Prisma.Decimal(1).plus(markupPercent.div(100)))
      .toDecimalPlaces(2);
  }

  private buildQuote(
    product: StoreProductWithBrand,
    dto: PurchaseStoreGiftCardDto,
    ngnPerUsd: number,
    costNgn: Prisma.Decimal,
    sellPriceNgn: Prisma.Decimal,
    balanceAvailable: Prisma.Decimal | undefined,
  ): PriceQuote {
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
      balanceAvailable: balanceAvailable || new Prisma.Decimal(0),
    };
  }

  private formatProduct(product: StoreProductWithBrand) {
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

  private formatOrderForUser(order: StoreOrderWithProduct) {
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

  private formatOrderForAdmin(order: StoreOrderWithUserProduct) {
    return {
      ...order,
      cardCode: null as string | null,
      cardPin: null as string | null,
    };
  }

  private giftUuidFromLink(link: string): string | null {
    try {
      const parts = new URL(link).pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  private deriveEmbeddedLink(uuid: string): string {
    const host =
      this.giftbit.getEnvironment() === 'testbed'
        ? 'testbedapp.giftbit.com'
        : 'app.giftbit.com';
    return `https://${host}/embeddedRewards/index/${uuid}`;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private async buildOrderResponse(
    orderId: string,
    extra: Record<string, unknown>,
  ) {
    const order = await this.prisma.giftCardStoreOrder.findUnique({
      where: { id: orderId },
      include: { product: { include: { brand: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      order: this.formatOrderForUser(order),
      ...extra,
    };
  }
}
