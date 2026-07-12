import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
export declare class NotificationsQueue {
    private readonly prisma;
    private readonly emailService;
    private readonly fcmService;
    private readonly logger;
    private isProcessing;
    constructor(prisma: PrismaService, emailService: EmailService, fcmService: FcmService);
    processQueue(): Promise<void>;
    dispatchLog(logId: string): Promise<boolean>;
    resend(logId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        recipient: string;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    }>;
}
