import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class GiftCardEventsHandler {
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    handleListingCreated(listing: any): Promise<void>;
    handleListingApproved(payload: {
        listing: any;
        moderatorId: string;
    }): Promise<void>;
    handleListingRejected(payload: {
        listing: any;
        moderatorId: string;
    }): Promise<void>;
    handleOrderCreated(payload: {
        order: any;
        buyerId: string;
        sellerId: string;
    }): Promise<void>;
    handleOrderCompleted(payload: {
        order: any;
        buyerId: string;
        sellerId: string;
    }): Promise<void>;
    handleOrderCancelled(payload: {
        order: any;
        cancelledBy: string;
    }): Promise<void>;
}
