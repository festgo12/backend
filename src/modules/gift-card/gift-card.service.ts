import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EncryptionService } from '../../core/utils/encryption';
import { LedgerService } from '../wallet/ledger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, GiftCardListingStatus, GiftCardOrderStatus } from '@src/generated/client';
import { CreateGiftCardListingDto } from './dto/create-listing.dto';
import { ModerateGiftCardListingDto } from './dto/moderate-listing.dto';
import { PurchaseGiftCardDto } from './dto/purchase-listing.dto';
import { ListGiftCardListingsDto, ListGiftCardOrdersDto } from './dto/list-listings.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GiftCardService {
  private readonly logger = new Logger(GiftCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly ledgerService: LedgerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── SELLER: Create Listing ────────────────────────────────────────────
  async createListing(sellerId: string, dto: CreateGiftCardListingDto) {
    const encryptedCode = this.encryption.encrypt(dto.cardCode);
    const encryptedPin = dto.cardPin ? this.encryption.encrypt(dto.cardPin) : null;

    const listing = await this.prisma.giftCardListing.create({
      data: {
        sellerId,
        brand: dto.brand,
        cardCode: encryptedCode,
        cardPin: encryptedPin,
        denomination: new Prisma.Decimal(dto.denomination),
        cardCurrency: dto.cardCurrency.toUpperCase(),
        exchangeRate: new Prisma.Decimal(dto.exchangeRate),
        askingPriceNgn: new Prisma.Decimal(dto.askingPriceNgn),
        status: 'PENDING_REVIEW',
        evidenceUrls: dto.evidenceUrls || [],
      },
      include: {
        seller: {
          include: { profile: true },
        },
      },
    });

    this.eventEmitter.emit('gift_card.listing.created', listing);
    this.logger.log(`Listing created: ${listing.id} by ${sellerId}`);

    return this.stripSensitive(listing);
  }

  // ─── PUBLIC: Browse Active Listings ─────────────────────────────────────
  async getActiveListings(dto: ListGiftCardListingsDto) {
    const where: Prisma.GiftCardListingWhereInput = {
      status: 'ACTIVE',
    };

    if (dto.brand) {
      where.brand = dto.brand;
    }

    if (dto.search) {
      where.OR = [
        { cardCurrency: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.giftCardListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            include: { profile: true },
          },
        },
      }),
      this.prisma.giftCardListing.count({ where }),
    ]);

    return {
      data: listings.map((l) => this.stripSensitive(l)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── PUBLIC: Listing Detail (no card codes) ────────────────────────────
  async getListingById(listingId: string) {
    const listing = await this.prisma.giftCardListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          include: { profile: true },
        },
        evidenceRecords: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Gift card listing not found');
    }

    return this.stripSensitive(listing);
  }

  // ─── SELLER: My Listings ───────────────────────────────────────────────
  async getMyListings(sellerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.giftCardListing.findMany({
        where: { sellerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.giftCardListing.count({ where: { sellerId } }),
    ]);

    return {
      data: listings.map((l) => this.stripSensitive(l)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── BUYER: Purchase Listing ───────────────────────────────────────────
  async purchaseListing(buyerId: string, dto: PurchaseGiftCardDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock and fetch listing
      const listing = await tx.$queryRaw<
        Array<{ id: string; sellerId: string; status: string; askingPriceNgn: string; cardCurrency: string; denomination: string; version: number }>
      >`SELECT id, sellerId, status, "askingPriceNgn"::text, "cardCurrency", denomination::text, version
         FROM "GiftCardListing"
         WHERE id = ${dto.listingId}
         FOR UPDATE`;

      if (!listing.length) {
        throw new NotFoundException('Gift card listing not found');
      }

      const row = listing[0];

      if (row.status !== 'ACTIVE') {
        throw new ConflictException('This listing is no longer available');
      }

      if (row.sellerId === buyerId) {
        throw new BadRequestException('You cannot purchase your own listing');
      }

      // 2. Get buyer's NGN wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: buyerId, currency: 'NGN' } },
      });

      if (!wallet) {
        throw new BadRequestException('NGN wallet not found. Please fund your wallet first.');
      }

      const priceNgn = new Prisma.Decimal(row.askingPriceNgn);
      const currentBalance = new Prisma.Decimal(wallet.balance);

      if (currentBalance.lessThan(priceNgn)) {
        throw new ConflictException(
          `Insufficient balance. Required ₦${priceNgn.toFixed(2)}, available ₦${currentBalance.toFixed(2)}`,
        );
      }

      // 3. Debit buyer's NGN wallet
      const debitRef = `GC-PURCHASE-${uuidv4()}`;
      await this.ledgerService.createEntry(tx, {
        walletId: wallet.id,
        amount: -priceNgn.toNumber(),
        type: 'GIFT_CARD_PURCHASE',
        reference: debitRef,
        metadata: { listingId: dto.listingId, sellerId: row.sellerId },
      });

      // 4. Create order (card codes NOT stored in order — only revealed on confirm)
      const order = await tx.giftCardOrder.create({
        data: {
          listingId: dto.listingId,
          buyerId,
          sellerId: row.sellerId,
          status: 'PENDING_DELIVERY',
          denomination: new Prisma.Decimal(row.denomination),
          cardCurrency: row.cardCurrency,
          askingPriceNgn: priceNgn,
          feeAmount: new Prisma.Decimal(0),
          totalPaidNgn: priceNgn,
        },
      });

      // 5. Update listing status to SOLD
      await tx.giftCardListing.update({
        where: { id: dto.listingId },
        data: { status: 'SOLD', version: { increment: 1 } },
      });

      this.eventEmitter.emit('gift_card.order.created', {
        order,
        listingId: dto.listingId,
        buyerId,
        sellerId: row.sellerId,
      });

      this.logger.log(`Gift card purchased: order ${order.id}, listing ${dto.listingId}, buyer ${buyerId}`);

      return order;
    });
  }

  // ─── BUYER: My Purchases (reveals card codes ONLY for COMPLETED orders) ─
  async getMyPurchases(buyerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.giftCardOrder.findMany({
        where: { buyerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: true,
          seller: { include: { profile: true } },
        },
      }),
      this.prisma.giftCardOrder.count({ where: { buyerId } }),
    ]);

    return {
      data: orders.map((o) => this.formatOrderForBuyer(o)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── SELLER: My Sales ──────────────────────────────────────────────────
  async getMySales(sellerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.giftCardOrder.findMany({
        where: { sellerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: true,
          buyer: { include: { profile: true } },
        },
      }),
      this.prisma.giftCardOrder.count({ where: { sellerId } }),
    ]);

    return {
      data: orders.map((o) => this.formatOrderForSeller(o)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── BUYER: Confirm Receipt (reveals card code + PIN) ─────────────────
  async confirmReceipt(buyerId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.giftCardOrder.findUnique({
        where: { id: orderId },
        include: { listing: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('You can only confirm your own orders');
      }

      if (order.status !== 'PENDING_DELIVERY') {
        throw new ConflictException(`Order cannot be confirmed in "${order.status}" status`);
      }

      // Mark order as completed
      const updatedOrder = await tx.giftCardOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          version: { increment: 1 },
        },
        include: {
          listing: true,
          seller: { include: { profile: true } },
        },
      });

      // NOW reveal the card codes to the buyer
      const cardCode = this.encryption.decrypt(order.listing.cardCode);
      const cardPin = order.listing.cardPin
        ? this.encryption.decrypt(order.listing.cardPin)
        : null;

      this.eventEmitter.emit('gift_card.order.completed', {
        order: updatedOrder,
        buyerId,
        sellerId: order.sellerId,
      });

      this.logger.log(`Gift card order confirmed: ${orderId} by buyer ${buyerId}`);

      return {
        ...this.formatOrderForBuyer(updatedOrder),
        cardCode,
        cardPin,
      };
    });
  }

  // ─── Either Party: Cancel Order ────────────────────────────────────────
  async cancelOrder(userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.giftCardOrder.findUnique({
        where: { id: orderId },
        include: { listing: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('You are not part of this order');
      }

      if (!['CREATED', 'PENDING_DELIVERY'].includes(order.status)) {
        throw new ConflictException(`Order cannot be cancelled in "${order.status}" status`);
      }

      // Refund buyer
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: order.buyerId, currency: 'NGN' } },
      });

      if (wallet) {
        const refundRef = `GC-REFUND-${uuidv4()}`;
        await this.ledgerService.createEntry(tx, {
          walletId: wallet.id,
          amount: order.totalPaidNgn.toNumber(),
          type: 'GIFT_CARD_SALE',
          reference: refundRef,
          metadata: { orderId, reason: 'order_cancelled' },
        });
      }

      // Update order status
      await tx.giftCardOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });

      // Re-activate listing
      await tx.giftCardListing.update({
        where: { id: order.listingId },
        data: { status: 'ACTIVE', version: { increment: 1 } },
      });

      this.eventEmitter.emit('gift_card.order.cancelled', {
        order,
        cancelledBy: userId,
      });

      this.logger.log(`Gift card order cancelled: ${orderId} by ${userId}`);

      return { success: true, message: 'Order cancelled and funds refunded' };
    });
  }

  // ─── SELLER: Delete Listing (only PENDING_REVIEW) ──────────────────────
  async deleteListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.giftCardListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    if (listing.status !== 'PENDING_REVIEW') {
      throw new ConflictException('Only pending review listings can be deleted');
    }

    await this.prisma.giftCardListing.delete({ where: { id: listingId } });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN METHODS
  // ═══════════════════════════════════════════════════════════════════════

  async getListingAdmin(listingId: string) {
    const listing = await this.prisma.giftCardListing.findUnique({
      where: { id: listingId },
      include: {
        seller: { include: { profile: true } },
        moderator: { include: { profile: true } },
        evidenceRecords: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: { include: { profile: true } },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Admin gets decrypted card codes
    return {
      ...listing,
      cardCode: this.encryption.decrypt(listing.cardCode),
      cardPin: listing.cardPin ? this.encryption.decrypt(listing.cardPin) : null,
    };
  }

  async getAllListingsAdmin(dto: ListGiftCardListingsDto) {
    const where: Prisma.GiftCardListingWhereInput = {};

    if (dto.brand) where.brand = dto.brand;
    if (dto.status) where.status = dto.status;

    if (dto.search) {
      where.OR = [
        { cardCurrency: { contains: dto.search, mode: 'insensitive' } },
        { seller: { email: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.giftCardListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { include: { profile: true } },
          moderator: { include: { profile: true } },
        },
      }),
      this.prisma.giftCardListing.count({ where }),
    ]);

    return {
      data: listings.map((l) => this.stripSensitive(l)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async moderateListing(listingId: string, dto: ModerateGiftCardListingDto, moderatorId: string) {
    const listing = await this.prisma.giftCardListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING_REVIEW') {
      throw new ConflictException('Only pending review listings can be moderated');
    }

    const updated = await this.prisma.giftCardListing.update({
      where: { id: listingId },
      data: {
        status: dto.status,
        moderatorId,
        moderatorNote: dto.moderatorNote,
        version: { increment: 1 },
      },
      include: {
        seller: { include: { profile: true } },
      },
    });

    const eventType = dto.status === 'ACTIVE' ? 'gift_card.listing.approved' : 'gift_card.listing.rejected';
    this.eventEmitter.emit(eventType, { listing: updated, moderatorId });

    this.logger.log(`Listing ${listingId} moderated to ${dto.status} by ${moderatorId}`);

    return updated;
  }

  async getAllOrdersAdmin(dto: ListGiftCardOrdersDto) {
    const where: Prisma.GiftCardOrderWhereInput = {};

    if (dto.status) where.status = dto.status;

    if (dto.search) {
      where.OR = [
        { buyer: { email: { contains: dto.search, mode: 'insensitive' } } },
        { seller: { email: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.giftCardOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: true,
          buyer: { include: { profile: true } },
          seller: { include: { profile: true } },
        },
      }),
      this.prisma.giftCardOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderDetailAdmin(orderId: string) {
    const order = await this.prisma.giftCardOrder.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Admin gets decrypted card codes
    return {
      ...order,
      listing: {
        ...order.listing,
        cardCode: this.encryption.decrypt(order.listing.cardCode),
        cardPin: order.listing.cardPin
          ? this.encryption.decrypt(order.listing.cardPin)
          : null,
      },
    };
  }

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalListings, pendingReview, activeListings, totalOrders, completedOrders, volumeResult] =
      await Promise.all([
        this.prisma.giftCardListing.count(),
        this.prisma.giftCardListing.count({ where: { status: 'PENDING_REVIEW' } }),
        this.prisma.giftCardListing.count({ where: { status: 'ACTIVE' } }),
        this.prisma.giftCardOrder.count(),
        this.prisma.giftCardOrder.count({ where: { status: 'COMPLETED' } }),
        this.prisma.giftCardOrder.aggregate({
          where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
          _sum: { totalPaidNgn: true },
        }),
      ]);

    return {
      totalListings,
      pendingReview,
      activeListings,
      totalOrders,
      completedOrders,
      totalVolumeNgn: volumeResult._sum.totalPaidNgn || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private stripSensitive(listing: any) {
    const { cardCode, cardPin, ...safe } = listing;
    return safe;
  }

  private formatOrderForBuyer(order: any) {
    const { listing, ...rest } = order;
    return {
      ...rest,
      brand: listing?.brand,
      cardCurrency: listing?.cardCurrency,
      denomination: listing?.denomination,
      // Card codes only revealed for COMPLETED orders
      cardCode: order.status === 'COMPLETED' && listing
        ? this.encryption.decrypt(listing.cardCode)
        : null,
      cardPin: order.status === 'COMPLETED' && listing?.cardPin
        ? this.encryption.decrypt(listing.cardPin)
        : null,
    };
  }

  private formatOrderForSeller(order: any) {
    const { listing, ...rest } = order;
    return {
      ...rest,
      brand: listing?.brand,
      cardCurrency: listing?.cardCurrency,
      denomination: listing?.denomination,
    };
  }
}
