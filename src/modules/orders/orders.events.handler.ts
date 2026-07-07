import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import type { Order } from '@prisma/client';

@Injectable()
export class OrdersEventsHandler {
  private readonly logger = new Logger(OrdersEventsHandler.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('order.created')
  async handleOrderCreated(order: Order) {
    this.logger.log(`Order created: ${order.id}`);
    
    // 1. Create Notification for Seller
    await this.prisma.notification.create({
      data: {
        userId: order.sellerId,
        title: 'New Buy Order',
        body: `You have a new buy order for ${order.cryptoAmount} NGN. Please approve within 15 minutes.`,
        data: { orderId: order.id },
      },
    });

    // 2. Audit Log
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

    // Notifications for both
    await this.prisma.notification.createMany({
      data: [
        {
          userId: order.buyerId,
          title: 'Order Completed',
          body: `Your order for ${order.cryptoAmount} has been completed.`,
          data: { orderId: order.id },
        },
        {
          userId: order.sellerId,
          title: 'Order Completed',
          body: `Your sale for ${order.fiatAmount} NGN has been completed.`,
          data: { orderId: order.id },
        },
      ],
    });

    // Audit Log
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

    await this.prisma.notification.create({
      data: {
        userId: otherPartyId,
        title: 'Order Cancelled/Declined',
        body: `The order ${order.id} has been cancelled or declined.`,
        data: { orderId: order.id },
      },
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

    await this.prisma.notification.createMany({
      data: [
        {
          userId: order.buyerId,
          title: 'Order Expired',
          body: `Your order for ${order.cryptoAmount} has expired.`,
          data: { orderId: order.id },
        },
        {
          userId: order.sellerId,
          title: 'Order Expired',
          body: `The order for ${order.fiatAmount} NGN has expired.`,
          data: { orderId: order.id },
        },
      ],
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

    await this.prisma.notification.createMany({
      data: [
        {
          userId: order.buyerId,
          title: 'Order Flagged for Fraud',
          body: `The order ${order.id} has been flagged for fraud and cancelled.`,
          data: { orderId: order.id },
        },
        {
          userId: order.sellerId,
          title: 'Order Flagged for Fraud',
          body: `The order ${order.id} has been flagged for fraud and cancelled.`,
          data: { orderId: order.id },
        },
      ],
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
