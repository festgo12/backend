import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { Prisma } from '@prisma/client';
export declare class NotificationsService {
    private readonly prisma;
    private readonly emailService;
    private readonly fcmService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService, fcmService: FcmService);
    registerFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<{
        id: string;
        userId: string;
        deviceId: string;
        fingerprint: string;
        lastLogin: Date;
        userAgent: string | null;
        ipAddress: string | null;
        fcmToken: string | null;
    }>;
    notifyUser(params: {
        userId: string;
        type: string;
        data?: Record<string, any>;
        customTitle?: string;
        customBody?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    getNotifications(userId: string, limit?: number, offset?: number): Promise<{
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        userId: string;
        title: string;
        body: string;
        isRead: boolean;
    }[]>;
    markAsRead(userId: string, notificationId: string): Promise<Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<Prisma.BatchPayload>;
    getTemplates(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        emailSubject: string | null;
        emailBody: string | null;
        pushTitle: string | null;
        pushBody: string | null;
        inAppTitle: string;
        inAppBody: string;
        smsBody: string | null;
        systemBody: string | null;
    }[]>;
    createOrUpdateTemplate(type: string, data: Partial<Prisma.NotificationTemplateCreateInput>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        emailSubject: string | null;
        emailBody: string | null;
        pushTitle: string | null;
        pushBody: string | null;
        inAppTitle: string;
        inAppBody: string;
        smsBody: string | null;
        systemBody: string | null;
    }>;
    getLogs(limit?: number, offset?: number): Promise<({
        user: {
            email: string | null;
            phone: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        metadata: Prisma.JsonValue | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        recipient: string;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    })[]>;
}
