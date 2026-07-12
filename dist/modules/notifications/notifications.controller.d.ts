import { NotificationsService } from './notifications.service';
import { NotificationsQueue } from './notifications.queue';
import type { User } from '@prisma/client';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly notificationsQueue;
    constructor(notificationsService: NotificationsService, notificationsQueue: NotificationsQueue);
    getMyNotifications(user: User, limit?: number, offset?: number): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        body: string;
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
        type: string;
        title: string;
        id: string;
        status: import(".prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        body: string;
        recipient: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    })[]>;
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
    updateTemplate(type: string, body: Record<string, any>): Promise<{
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
    resendNotification(id: string): Promise<{
        success: boolean;
    }>;
}
