import { NotificationsService } from './notifications.service';
import { NotificationsQueue } from './notifications.queue';
import type { User } from '@src/generated/client';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly notificationsQueue;
    constructor(notificationsService: NotificationsService, notificationsQueue: NotificationsQueue);
    getMyNotifications(user: User, limit?: number, offset?: number): Promise<{
        id: string;
        createdAt: Date;
        data: import("@src/generated/client/runtime/library").JsonValue | null;
        userId: string;
        title: string;
        isRead: boolean;
        body: string;
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
        status: import("@src/generated/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        title: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        body: string;
        channel: import("@src/generated/client").$Enums.NotificationChannel;
        recipient: string;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    })[]>;
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
    updateTemplate(type: string, body: Record<string, any>): Promise<{
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
    resendNotification(id: string): Promise<{
        success: boolean;
    }>;
}
