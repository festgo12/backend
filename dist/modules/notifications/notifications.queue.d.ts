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
        type: string;
        title: string;
        id: string;
        status: import("@src/generated/client").$Enums.NotificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        body: string;
        recipient: string;
        channel: import("@src/generated/client").$Enums.NotificationChannel;
        retryCount: number;
        maxRetries: number;
        nextTryAt: Date | null;
        errorDetails: string | null;
    }>;
}
