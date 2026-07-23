import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export interface CreateAlertParams {
    userId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}
export declare class AlertEngineService {
    private prisma;
    private notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    createAlert(params: CreateAlertParams): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        severity: string;
        title: string;
        message: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        isRead: boolean;
    }>;
    getAlertStats(userId: string): Promise<{
        total: number;
        unread: number;
        bySeverity: {
            severity: string;
            count: number;
        }[];
        topTypes: {
            type: string;
            count: number;
        }[];
    }>;
}
