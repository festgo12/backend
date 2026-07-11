import { NotificationsService } from './notifications.service';
import { NotificationsQueue } from './notifications.queue';
import type { User } from '@prisma/client';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly notificationsQueue;
    constructor(notificationsService: NotificationsService, notificationsQueue: NotificationsQueue);
    getMyNotifications(user: User, limit?: number, offset?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        body: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        isRead: boolean;
    }[]>;
    markAsRead(user: User, id: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(user: User): Promise<{
        success: boolean;
    }>;
    registerFcmToken(user: User, deviceId: string, fcmToken: string): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
    getSystemLogs(limit?: number, offset?: number): Promise<({
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
        title: string;
        body: string;
        type: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        recipient: string;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    getTemplates(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
    updateTemplate(type: string, body: Record<string, any>): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
    resendNotification(id: string): Promise<{
        success: boolean;
    }>;
}
