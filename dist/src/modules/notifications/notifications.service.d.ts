import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { Prisma } from '@src/generated/client';
export declare class NotificationsService {
    private readonly prisma;
    private readonly emailService;
    private readonly fcmService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService, fcmService: FcmService);
    registerFcmToken(userId: string, deviceId: string, fcmToken: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        deviceId: string;
        fingerprint: string;
        deviceName: string | null;
        browser: string | null;
        osVersion: string | null;
        location: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        fcmToken: string | null;
        lastLogin: Date;
        lastActivity: Date | null;
    }>;
    notifyUser(params: {
        userId: string;
        type: string;
        data?: Record<string, any>;
        customTitle?: string;
        customBody?: string;
    }): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        userId: string;
        isRead: boolean;
        body: string;
    }>;
    getNotifications(userId: string, limit?: number, offset?: number): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        userId: string;
        isRead: boolean;
        body: string;
    }[]>;
    markAsRead(userId: string, notificationId: string): Promise<Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<Prisma.BatchPayload>;
    getTemplates(): Promise<{
        name: string;
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        name: string;
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        type: string;
        title: string;
        id: string;
        status: import("@src/generated/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        metadata: Prisma.JsonValue | null;
        body: string;
        channel: import("@src/generated/client").$Enums.NotificationChannel;
        recipient: string;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    })[]>;
}
