import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GiftCardStoreEventsHandler {
  private readonly logger = new Logger(GiftCardStoreEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('gift-card-store.order.pending')
  async handleOrderPending(payload: PendingOrderEvent) {
    const { order } = payload;
    this.logger.log(`Gift card store order pending delivery: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.userId,
      type: 'GIFT_CARD_STORE_ORDER_PENDING',
      customTitle: 'Gift Card Order Placed',
      customBody:
        'Your gift card order has been placed. Your claim link will appear in your gift cards shortly.',
      data: { orderId: order.id, amount: order.sellPriceNgn },
    });
  }

  @OnEvent('gift-card-store.order.completed')
  async handleOrderCompleted(payload: CompletedOrderEvent) {
    const { order } = payload;
    this.logger.log(`Gift card store order delivered: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.userId,
      type: 'GIFT_CARD_STORE_ORDER_COMPLETED',
      customTitle: 'Gift Card Delivered',
      customBody: `Your ${order.productName || 'gift card'} is ready. Tap to open and claim your card.`,
      data: { orderId: order.id, amount: order.amount },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: order.userId,
        action: 'GIFT_CARD_STORE_ORDER_COMPLETED',
        metadata: { orderId: order.id },
      },
    });
  }

  @OnEvent('gift-card-store.order.failed')
  async handleOrderFailed(payload: FailedOrderEvent) {
    const { order } = payload;
    this.logger.log(`Gift card store order failed: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.userId,
      type: 'GIFT_CARD_STORE_ORDER_FAILED',
      customTitle: 'Gift Card Order Failed',
      customBody:
        'Your gift card order could not be fulfilled and has been refunded to your wallet. Please try again.',
      data: { orderId: order.id },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: order.userId,
        action: 'GIFT_CARD_STORE_ORDER_FAILED',
        metadata: { orderId: order.id, reason: order.message },
      },
    });
  }
}

interface PendingOrderEvent {
  order: {
    id: string;
    userId: string;
    sellPriceNgn?: string;
  };
}

interface CompletedOrderEvent {
  order: {
    id: string;
    userId: string;
    productName?: string;
    amount?: string;
  };
}

interface FailedOrderEvent {
  order: {
    id: string;
    userId: string;
    message?: string;
  };
}
