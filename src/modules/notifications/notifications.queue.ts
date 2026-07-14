import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { NotificationChannel, NotificationStatus } from '@src/generated/client';

@Injectable()
export class NotificationsQueue {
  private readonly logger = new Logger(NotificationsQueue.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Cron runner executing matching jobs every 10 seconds.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingLogs = await this.prisma.notificationLog.findMany({
        where: {
          status: { in: [NotificationStatus.PENDING, NotificationStatus.RETRYING] },
          nextTryAt: { lte: new Date() },
        },
        take: 20, // Process small batches for stability
      });

      if (pendingLogs.length > 0) {
        this.logger.log(`Processing ${pendingLogs.length} pending notifications from database queue.`);
      }

      for (const log of pendingLogs) {
        await this.dispatchLog(log.id);
      }
    } catch (error: any) {
      this.logger.error(`Error processing notification queue check: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes a single notification log item and updates its status/retries.
   */
  async dispatchLog(logId: string): Promise<boolean> {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id: logId },
    });

    if (!log) return false;

    let success = false;
    let errorDetails: string | undefined;

    try {
      if (log.channel === NotificationChannel.EMAIL) {
        success = await this.emailService.sendEmail(log.recipient, log.title, log.body);
      } else if (log.channel === NotificationChannel.PUSH) {
        const metadata = log.metadata ? (log.metadata as Record<string, any>) : undefined;
        success = await this.fcmService.sendPushNotification(log.recipient, log.title, log.body, metadata);
      } else if (log.channel === NotificationChannel.SYSTEM) {
        // Console print logging format for external infrastructure alerts
        success = true;
        this.logger.log(`[SYSTEM ALERT LOG OUT] Channel: SYSTEM | Content: ${log.body}`);
      } else if (log.channel === NotificationChannel.IN_APP) {
        success = true; // In-app is instantly set sent
      }
    } catch (e: any) {
      errorDetails = e.message;
      success = false;
    }

    if (success) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.SENT,
          errorDetails: null,
          nextTryAt: null,
        },
      });
      return true;
    } else {
      const nextRetryCount = log.retryCount + 1;
      const isFailedPermanently = nextRetryCount >= log.maxRetries;

      // Exponential backoff: 30s * 2^retryCount (e.g. 30s, 60s, 120s)
      const backoffSec = 30 * Math.pow(2, log.retryCount);
      const nextTryAt = isFailedPermanently
        ? null
        : new Date(Date.now() + backoffSec * 1000);

      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: isFailedPermanently ? NotificationStatus.FAILED : NotificationStatus.RETRYING,
          retryCount: nextRetryCount,
          nextTryAt,
          errorDetails: errorDetails || 'Delivery process reported failure/timeout.',
        },
      });

      this.logger.warn(
        `Failed notification log ${logId} delivery attempt count: ${nextRetryCount}/${log.maxRetries}. ` +
          `Permanently failed: ${isFailedPermanently}`,
      );
      return false;
    }
  }

  /**
   * Resets status on a log to retry sending it.
   */
  async resend(logId: string) {
    const existing = await this.prisma.notificationLog.findUnique({
      where: { id: logId },
    });

    if (!existing) {
      throw new NotFoundException(`Notification log ${logId} not found.`);
    }

    return this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationStatus.PENDING,
        retryCount: 0,
        nextTryAt: new Date(), // Pick up immediately
        errorDetails: null,
      },
    });
  }
}
