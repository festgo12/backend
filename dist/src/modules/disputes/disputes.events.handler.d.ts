import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Dispute, Evidence, Order } from '@src/generated/client';
export declare class DisputesEventsHandler {
    private prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    handleDisputeCreated(payload: {
        dispute: Dispute;
        order: Order | null;
    }): Promise<void>;
    handleDisputeStatusChanged(payload: {
        dispute: Dispute & {
            order: Order;
            initiator: any;
            evidence: any[];
        };
        previousStatus: string;
        adminId: string;
        reason?: string;
    }): Promise<void>;
    handleDisputeResolved(payload: {
        dispute: Dispute & {
            order: Order;
            initiator: any;
        };
        resolution: string;
        outcome: string;
        resolvedBy: string;
    }): Promise<void>;
    handleEvidenceUploaded(payload: {
        evidence: Evidence & {
            uploadedBy: any;
        };
        dispute: Dispute;
    }): Promise<void>;
    handleDisputeAssigned(payload: {
        dispute: Dispute & {
            order: Order;
        };
        assigneeId: string;
    }): Promise<void>;
    handleOrderFrozen(payload: {
        order: Order;
        disputeId: string;
        adminId: string;
    }): Promise<void>;
}
