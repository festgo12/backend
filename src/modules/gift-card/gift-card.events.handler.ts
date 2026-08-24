import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GiftCardEventsHandler {
  private readonly logger = new Logger(GiftCardEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('gift_card.listing.created')
  async handleListingCreated(listing: any) {
    this.logger.log(`Gift card listing created: ${listing.id}`);

    await this.prisma.securityLog.create({
      data: {
        userId: listing.sellerId,
        action: 'GIFT_CARD_LISTING_CREATED',
        metadata: {
          listingId: listing.id,
          brand: listing.brand,
          askingPriceNgn: listing.askingPriceNgn,
        },
      },
    });
  }

  @OnEvent('gift_card.listing.approved')
  async handleListingApproved(payload: { listing: any; moderatorId: string }) {
    const { listing, moderatorId } = payload;
    this.logger.log(`Gift card listing approved: ${listing.id} by ${moderatorId}`);

    await this.notifications.notifyUser({
      userId: listing.sellerId,
      type: 'GIFT_CARD_LISTING_APPROVED',
      customTitle: 'Gift Card Listing Approved',
      customBody: `Your ${listing.brand} gift card listing has been approved and is now live in the marketplace.`,
      data: { listingId: listing.id, brand: listing.brand },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: moderatorId,
        action: 'GIFT_CARD_LISTING_APPROVED',
        metadata: { listingId: listing.id },
      },
    });
  }

  @OnEvent('gift_card.listing.rejected')
  async handleListingRejected(payload: { listing: any; moderatorId: string }) {
    const { listing, moderatorId } = payload;
    this.logger.log(`Gift card listing rejected: ${listing.id} by ${moderatorId}`);

    const reasonSuffix = listing.moderatorNote ? ` Reason: ${listing.moderatorNote}` : '';

    await this.notifications.notifyUser({
      userId: listing.sellerId,
      type: 'GIFT_CARD_LISTING_REJECTED',
      customTitle: 'Gift Card Listing Rejected',
      customBody: `Your ${listing.brand} gift card listing was rejected.${reasonSuffix}`,
      data: { listingId: listing.id, brand: listing.brand, reason: listing.moderatorNote },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: moderatorId,
        action: 'GIFT_CARD_LISTING_REJECTED',
        metadata: { listingId: listing.id, reason: listing.moderatorNote },
      },
    });
  }

  @OnEvent('gift_card.order.created')
  async handleOrderCreated(payload: { order: any; buyerId: string; sellerId: string }) {
    const { order, buyerId, sellerId } = payload;
    this.logger.log(`Gift card order created: ${order.id}`);

    await this.notifications.notifyUser({
      userId: buyerId,
      type: 'GIFT_CARD_PURCHASE',
      customTitle: 'Gift Card Purchase Confirmed',
      customBody: `Your gift card purchase has been confirmed. Please confirm receipt once you've received the card.`,
      data: { orderId: order.id },
    });

    await this.notifications.notifyUser({
      userId: sellerId,
      type: 'GIFT_CARD_SOLD',
      customTitle: 'Gift Card Sold',
      customBody: `Your gift card has been purchased! Funds will be released upon buyer confirmation.`,
      data: { orderId: order.id },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: buyerId,
        action: 'GIFT_CARD_ORDER_CREATED',
        metadata: {
          orderId: order.id,
          listingId: order.listingId,
          amount: order.totalPaidNgn,
        },
      },
    });
  }

  @OnEvent('gift_card.order.completed')
  async handleOrderCompleted(payload: { order: any; buyerId: string; sellerId: string }) {
    const { order, buyerId, sellerId } = payload;
    this.logger.log(`Gift card order completed: ${order.id}`);

    await this.notifications.notifyUser({
      userId: buyerId,
      type: 'GIFT_CARD_COMPLETED',
      customTitle: 'Gift Card Received',
      customBody: `Your gift card code is now available. Thank you for your purchase!`,
      data: { orderId: order.id },
    });

    await this.notifications.notifyUser({
      userId: sellerId,
      type: 'GIFT_CARD_SALE_COMPLETED',
      customTitle: 'Gift Card Sale Completed',
      customBody: `The buyer has confirmed receipt. Your funds have been released.`,
      data: { orderId: order.id },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: buyerId,
        action: 'GIFT_CARD_ORDER_COMPLETED',
        metadata: {
          orderId: order.id,
          amount: order.totalPaidNgn || order.askingPriceNgn,
        },
      },
    });
  }

  @OnEvent('gift_card.order.cancelled')
  async handleOrderCancelled(payload: { order: any; cancelledBy: string }) {
    const { order, cancelledBy } = payload;
    this.logger.log(`Gift card order cancelled: ${order.id} by ${cancelledBy}`);

    const cancelledByBuyer = cancelledBy === order.buyerId;

    await this.notifications.notifyUser({
      userId: order.buyerId,
      type: 'GIFT_CARD_ORDER_CANCELLED',
      customTitle: 'Gift Card Order Cancelled',
      customBody: cancelledByBuyer
        ? 'You have cancelled your gift card order. Funds have been refunded.'
        : 'The gift card order has been cancelled by the seller. Your funds have been refunded.',
      data: { orderId: order.id },
    });

    const otherPartyId = cancelledByBuyer ? order.sellerId : order.buyerId;

    await this.notifications.notifyUser({
      userId: otherPartyId,
      type: 'GIFT_CARD_ORDER_CANCELLED',
      customTitle: 'Gift Card Order Cancelled',
      customBody: `The gift card order has been cancelled by ${cancelledByBuyer ? 'the buyer' : 'the seller'}.`,
      data: { orderId: order.id },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: cancelledBy,
        action: 'GIFT_CARD_ORDER_CANCELLED',
        metadata: { orderId: order.id },
      },
    });
  }
}
