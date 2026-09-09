import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EncryptionService } from '../../core/utils/encryption';
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
  ReloadlyClient,
  ReloadlyBrand,
  ReloadlyGiftCard,
  ReloadlyProduct,
  ReloadlyWebhook,
} from './reloadly.client';
import { PurchaseStoreGiftCardDto } from './dto/purchase-store-gift-card.dto';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { primaryWalletWhere } from '../wallet/wallet-query.util';

const DEFAULT_NGN_PER_USD = 1550;

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

interface SyncOptions {
  countries?: string[];
}

export interface PriceQuote {
  productId: string;
  providerProductId: number;
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
export class GiftCardStoreService {
  private readonly logger = new Logger(GiftCardStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly ledgerService: LedgerService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly eventEmitter: EventEmitter2,
    private readonly reloadly: ReloadlyClient,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // CATALOG
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Pulls products for NG + global and upserts the local cache. New products
   * are added as disabled so the catalog only goes live after admin review.
   */
  async syncCatalog(options: SyncOptions = {}) {
    if (!this.reloadly.isConfigured()) {
      throw new BadRequestException(
        'Reloadly is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.',
      );
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
        const content: ReloadlyProduct[] = res?.content || [];

        for (const product of content) {
          await this.upsertProduct(product, countryCode, ngnPerUsd);
          syncedProducts += 1;
        }

        totalPages = res?.totalPages || totalPages;
        page += 1;
      }
    }

    // Brands: pull the brand list for logos/display.
    for (let page = 0; page < 5; page += 1) {
      const res = await this.reloadly.getBrands(page, 100);
      const content: ReloadlyBrand[] = res?.content || [];
      if (!content.length) break;
      for (const brand of content) {
        const upserted = await this.upsertBrand(brand);
        if (upserted) syncedBrands += 1;
      }
      if (res?.last) break;
    }

    this.logger.log(
      `Catalog sync complete: ${syncedProducts} products, ${syncedBrands} brands across ${countries.join(', ')}`,
    );

    return {
      syncedProducts,
      syncedBrands,
      countries,
      lastSyncedAt: new Date(),
    };
  }

  private async upsertBrand(brand: ReloadlyBrand): Promise<boolean> {
    const providerBrandId = Number(brand?.id);
    if (!providerBrandId) return false;

    const logos: unknown = brand.logoUrls || [];
    const logoList = Array.isArray(logos) ? (logos as string[]) : [];
    const logoUrl = typeof logos === 'string' ? logos : logoList[0] || null;
    const backgroundColor = logoList.length > 1 ? logoList[1] : logoUrl;

    const existing = await this.prisma.giftCardStoreBrand.findUnique({
      where: { providerBrandId },
    });

    await this.prisma.giftCardStoreBrand.upsert({
      where: { providerBrandId },
      update: {
        brandName:
          brand?.name || existing?.brandName || `Brand ${providerBrandId}`,
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

  private async upsertProduct(
    product: ReloadlyProduct,
    countryCode: string,
    ngnPerUsd: number,
  ): Promise<void> {
    const providerProductId = Number(product?.productId);
    if (!providerProductId) return;

    // Reloadly may embed the brand inside the product payload.
    let brandId: string | null = null;
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

    const denominationType = this.mapDenominationType(
      product?.denominationType,
    );
    const sendersCurrency = (
      product?.senderCurrencyCode || 'USD'
    ).toUpperCase();
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
          ? (product.fixedRecipientDenominations as Prisma.InputJsonValue)
          : undefined,
        minDenomination: product?.minRecipientDenomination
          ? new Prisma.Decimal(product.minRecipientDenomination)
          : null,
        maxDenomination: product?.maxRecipientDenomination
          ? new Prisma.Decimal(product.maxRecipientDenomination)
          : null,
        senderFee: new Prisma.Decimal(Number(product?.senderFee || 0)),
        discountPercentage: new Prisma.Decimal(
          Number(product?.discountPercentage || 0),
        ),
        providerPriceNgn: new Prisma.Decimal(indicativeNgn),
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
          ? (product.fixedRecipientDenominations as Prisma.InputJsonValue)
          : undefined,
        minDenomination: product?.minRecipientDenomination
          ? new Prisma.Decimal(product.minRecipientDenomination)
          : null,
        maxDenomination: product?.maxRecipientDenomination
          ? new Prisma.Decimal(product.maxRecipientDenomination)
          : null,
        senderFee: new Prisma.Decimal(Number(product?.senderFee || 0)),
        discountPercentage: new Prisma.Decimal(
          Number(product?.discountPercentage || 0),
        ),
        providerPriceNgn: new Prisma.Decimal(indicativeNgn),
        enabled: false,
        markupPercent: new Prisma.Decimal(0),
        providerResponse: this.toJson({
          raw: product,
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
   * Debites the buyer's NGN wallet and places the Reloadly order.
   * Card codes are delivered immediately when the provider returns them
   * synchronously; otherwise the order stays PENDING until the webhook lands.
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

    // 2. Call Reloadly outside the DB transaction.
    let providerTransactionId: string | null = null;
    try {
      const senderName =
        [user.profile?.firstName, user.profile?.lastName]
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

      // 3. Attempt synchronous code delivery.
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
        message:
          'Order placed. Your card code will appear here as soon as the provider delivers it.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Gift card store order ${order.id} provider failure: ${message}`,
      );
      await this.failOrder(order.id, message, providerTransactionId);
      throw new BadRequestException(
        `Gift card order failed: ${message}. Your funds have been refunded.`,
      );
    }
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
  // WEBHOOK / DELIVERY
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Resolves an order identified by its customIdentifier (our order id) or
   * provider transaction id against a webhook / polling event.
   */
  async resolveOrder(payload: ReloadlyWebhook) {
    const data = payload?.data;
    const identifier =
      data?.customIdentifier ||
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
      this.logger.warn(
        `No gift card store order matched webhook identifier ${identifier}`,
      );
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

    // Provider reports failure → refund and mark FAILED.
    if (status.includes('FAILED') || data?.errorCode) {
      await this.failOrder(
        order.id,
        data?.message || data?.errorCode || 'Provider order failed',
        order.providerOrderId,
      );
      return { matched: true, orderId: order.id, order, failed: true };
    }

    // Attempt code delivery for any non-failed terminal/processing state.
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

  private async finalizeOrder(
    orderId: string,
    giftCard: ReloadlyGiftCard,
    providerResponse?: unknown,
  ) {
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

  private usdToNgnThrough(currency: string, ngnPerUsd: number): number {
    // Store only handles USD- and NGN-priced products for now.
    if (currency === 'NGN') return 1;
    return ngnPerUsd;
  }

  private mapDenominationType(type?: string): GiftCardDenominationType {
    switch (String(type || '').toUpperCase()) {
      case 'FIXED':
        return GiftCardDenominationType.FIXED;
      case 'RANGE':
        return GiftCardDenominationType.RANGE;
      default:
        return GiftCardDenominationType.OPEN;
    }
  }

  private firstDenomination(product: ReloadlyProduct): number {
    if (
      Array.isArray(product?.fixedRecipientDenominations) &&
      product.fixedRecipientDenominations.length
    ) {
      return Number(product.fixedRecipientDenominations[0]);
    }
    return (
      Number(product?.minRecipientDenomination || 0) ||
      Number(product?.maxRecipientDenomination || 5) ||
      5
    );
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
    const senderNgn = this.usdToNgnThrough(product.currencyCode, ngnPerUsd);
    const unit = new Prisma.Decimal(amount).mul(senderNgn);
    const fee = new Prisma.Decimal(Number(product.senderFee || 0)).mul(
      senderNgn,
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
      cardCode:
        order.status === 'COMPLETED' && order.cardCode
          ? this.encryption.decrypt(order.cardCode)
          : null,
      cardPin:
        order.status === 'COMPLETED' && order.cardPin
          ? this.encryption.decrypt(order.cardPin)
          : null,
    };
  }

  private formatOrderForAdmin(order: StoreOrderWithUserProduct) {
    return {
      ...order,
      cardCode: null as string | null,
      cardPin: null as string | null,
    };
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
