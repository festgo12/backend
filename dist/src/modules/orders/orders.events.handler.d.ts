import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Order } from '@src/generated/client';
export declare class OrdersEventsHandler {
    private prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    handleOrderCreated(order: Order): Promise<void>;
    handleOrderCompleted(order: Order): Promise<void>;
    handleOrderDeclined(payload: {
        order: Order;
        initiatorId: string;
    }): Promise<void>;
    handleOrderExpired(order: Order): Promise<void>;
    handleOrderFraudFlagged(payload: {
        order: Order;
        initiatorId: string;
    }): Promise<void>;
}
