import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class GiftCardStoreEventsHandler {
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    handleOrderPending(payload: PendingOrderEvent): Promise<void>;
    handleOrderCompleted(payload: CompletedOrderEvent): Promise<void>;
    handleOrderFailed(payload: FailedOrderEvent): Promise<void>;
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
export {};
