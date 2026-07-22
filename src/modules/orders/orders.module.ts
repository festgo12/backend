import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersEventsHandler } from './orders.events.handler';
import { OrdersScheduler } from './orders.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersEventsHandler, OrdersScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
