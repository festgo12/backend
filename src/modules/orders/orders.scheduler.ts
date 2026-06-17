import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrderExpirations() {
    this.logger.debug('Checking for expired orders...');

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_SELLER,
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredOrders.length > 0) {
      this.logger.log(`Found ${expiredOrders.length} expired orders. Processing...`);

      for (const order of expiredOrders) {
        try {
          await this.ordersService.declineOrder(order.id, 'SYSTEM');
          this.logger.log(`Order ${order.id} marked as EXPIRED by system.`);
        } catch (error) {
          this.logger.error(`Failed to expire order ${order.id}: ${error.message}`);
        }
      }
    }
  }
}
