import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Order } from '@src/generated/client';

@Injectable()
export class OrdersEventsHandler {
  private readonly logger = new Logger(OrdersEventsHandler.name);

  constructor(
    private prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(order: Order) {
    this.logger.log(`Order created: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.sellerId,
      type: 'ORDER_CREATED',
      data: { orderId: order.id, cryptoAmount: order.cryptoAmount.toString(), fiatAmount: order.fiatAmount.toString() },
      customTitle: 'New Buy Order',
      customBody: `You have a new buy order for ${order.cryptoAmount} NGN. Please approve within 15 minutes.`,
    });

    await this.prisma.securityLog.create({
      data: {
        userId: order.buyerId,
        action: 'ORDER_CREATED',
        metadata: { orderId: order.id, fiatAmount: order.fiatAmount, cryptoAmount: order.cryptoAmount },
      },
    });
  }

  @OnEvent('order.completed')
  async handleOrderCompleted(order: Order) {
    this.logger.log(`Order completed: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.buyerId,
      type: 'ORDER_COMPLETED',
      data: { orderId: order.id, cryptoAmount: order.cryptoAmount.toString(), fiatAmount: order.fiatAmount.toString() },
      customTitle: 'Order Completed',
      customBody: `Your order for ${order.cryptoAmount} has been completed.`,
    });

    await this.notifications.notifyUser({
      userId: order.sellerId,
      type: 'ORDER_COMPLETED',
      data: { orderId: order.id, cryptoAmount: order.cryptoAmount.toString(), fiatAmount: order.fiatAmount.toString() },
      customTitle: 'Order Completed',
      customBody: `Your sale for ${order.fiatAmount} NGN has been completed.`,
    });

    await this.prisma.securityLog.create({
      data: {
        userId: order.sellerId,
        action: 'ORDER_APPROVED',
        metadata: { orderId: order.id },
      },
    });
  }

  @OnEvent('order.declined')
  async handleOrderDeclined(payload: { order: Order; initiatorId: string }) {
    const { order, initiatorId } = payload;
    this.logger.log(`Order declined: ${order.id} by ${initiatorId}`);

    const otherPartyId = initiatorId === order.buyerId ? order.sellerId : order.buyerId;

    await this.notifications.notifyUser({
      userId: otherPartyId,
      type: 'ORDER_DECLINED',
      data: { orderId: order.id },
      customTitle: 'Order Cancelled/Declined',
      customBody: `The order ${order.id} has been cancelled or declined.`,
    });

    await this.prisma.securityLog.create({
      data: {
        userId: initiatorId,
        action: 'ORDER_DECLINED',
        metadata: { orderId: order.id },
      },
    });
  }

  @OnEvent('order.expired')
  async handleOrderExpired(order: Order) {
    this.logger.log(`Order expired: ${order.id}`);

    await this.notifications.notifyUser({
      userId: order.buyerId,
      type: 'ORDER_EXPIRED',
      data: { orderId: order.id, cryptoAmount: order.cryptoAmount.toString(), fiatAmount: order.fiatAmount.toString() },
      customTitle: 'Order Expired',
      customBody: `Your order for ${order.cryptoAmount} has expired.`,
    });

    await this.notifications.notifyUser({
      userId: order.sellerId,
      type: 'ORDER_EXPIRED',
      data: { orderId: order.id, cryptoAmount: order.cryptoAmount.toString(), fiatAmount: order.fiatAmount.toString() },
      customTitle: 'Order Expired',
      customBody: `The order for ${order.fiatAmount} NGN has expired.`,
    });

    await this.prisma.securityLog.create({
      data: {
        userId: order.buyerId,
        action: 'ORDER_EXPIRED',
        metadata: { orderId: order.id },
      },
    });
  }

  @OnEvent('order.fraud_flagged')
  async handleOrderFraudFlagged(payload: { order: Order; initiatorId: string }) {
    const { order, initiatorId } = payload;
    this.logger.warn(`Order ${order.id} flagged as FRAUD by ${initiatorId}`);

    await this.notifications.notifyUser({
      userId: order.buyerId,
      type: 'ORDER_FRAUD_FLAGGED',
      data: { orderId: order.id, status: order.status },
      customTitle: 'Order Flagged for Fraud',
      customBody: `The order ${order.id} has been flagged for fraud and cancelled.`,
    });

    await this.notifications.notifyUser({
      userId: order.sellerId,
      type: 'ORDER_FRAUD_FLAGGED',
      data: { orderId: order.id, status: order.status },
      customTitle: 'Order Flagged for Fraud',
      customBody: `The order ${order.id} has been flagged for fraud and cancelled.`,
    });

    await this.prisma.securityLog.create({
      data: {
        userId: initiatorId,
        action: 'ORDER_FRAUD_FLAGGED',
        metadata: { orderId: order.id, status: order.status },
      },
    });
  }
}
