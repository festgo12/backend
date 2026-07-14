import { PrismaService } from '../../core/database/prisma.service';
import type { Order } from '@src/generated/client';
export declare class OrdersEventsHandler {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
