import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Registers or updates client device FCM push parameters.
   */
  async registerFcmToken(userId: string, deviceId: string, fcmToken: string) {
    this.logger.log(`Registering FCM to device: ${deviceId} for user: ${userId}`);
    return this.prisma.device.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      update: {
        fcmToken,
        lastLogin: new Date(),
      },
      create: {
        userId,
        deviceId,
        fcmToken,
        fingerprint: 'mobile-fcm-reg',
      },
    });
  }

  /**
   * Enqueues or dispatches notification variants for a user based on a template.
   */
  async notifyUser(params: {
    userId: string;
    type: string;
    data?: Record<string, any>;
    customTitle?: string;
    customBody?: string;
  }) {
    const { userId, type, data = {}, customTitle, customBody } = params;

    // 1. Fetch recipient user preferences & profiles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        devices: {
          where: { fcmToken: { not: null } },
          select: { fcmToken: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Recipient user ${userId} not found.`);
    }

    // 2. Fetch template if it exists
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { type },
    });

    // Handle template mapping/resolving or fallback to custom inputs
    const render = (tpl?: string | null) => {
      if (tpl) return this.emailService.renderTemplate(tpl, data);
      return '';
    };

    const inAppTitle = customTitle || render(template?.inAppTitle) || 'Notification';
    const inAppBody = customBody || render(template?.inAppBody) || 'You have a new message.';
    const emailSubject = render(template?.emailSubject) || inAppTitle;
    const emailBody = render(template?.emailBody) || inAppBody;
    const pushTitle = render(template?.pushTitle) || inAppTitle;
    const pushBody = render(template?.pushBody) || inAppBody;
    const systemBody = render(template?.systemBody) || inAppBody;

    // 3. Write User-facing In-App Notification (Always generated for feed history)
    const inAppNotification = await this.prisma.notification.create({
      data: {
        userId,
        title: inAppTitle,
        body: inAppBody,
        data: data ? (data as Prisma.InputJsonValue) : undefined,
      },
    });

    // Write logs tracking IN_APP channel as instantly sent
    await this.prisma.notificationLog.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.IN_APP,
        recipient: userId,
        title: inAppTitle,
        body: inAppBody,
        status: NotificationStatus.SENT,
        nextTryAt: null,
      },
    });

    const isEmailAllowed = user.preferences?.emailNotify ?? true;
    const isPushAllowed = user.preferences?.pushNotify ?? true;

    // 4. Enqueue Email (SMTP NodeMailer) if user has email & prefers it
    if (user.email && isEmailAllowed) {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          type,
          channel: NotificationChannel.EMAIL,
          recipient: user.email,
          title: emailSubject,
          body: emailBody,
          status: NotificationStatus.PENDING,
          nextTryAt: new Date(),
        },
      });
    }

    // 5. Enqueue Dev Push (FCM) notifications on active devices
    if (isPushAllowed) {
      for (const dev of user.devices) {
        if (dev.fcmToken) {
          await this.prisma.notificationLog.create({
            data: {
              userId,
              type,
              channel: NotificationChannel.PUSH,
              recipient: dev.fcmToken,
              title: pushTitle,
              body: pushBody,
              status: NotificationStatus.PENDING,
              nextTryAt: new Date(),
              metadata: data ? (data as Prisma.InputJsonValue) : undefined,
            },
          });
        }
      }
    }

    // 6. Enqueue SYSTEM channel logger entry
    if (template?.systemBody) {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          type,
          channel: NotificationChannel.SYSTEM,
          recipient: 'system-console',
          title: inAppTitle,
          body: systemBody,
          status: NotificationStatus.PENDING,
          nextTryAt: new Date(),
        },
      });
    }

    return inAppNotification;
  }

  // --- User Read API ---
  async getNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // --- Admin API ---
  async getTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { type: 'asc' },
    });
  }

  async createOrUpdateTemplate(type: string, data: Partial<Prisma.NotificationTemplateCreateInput>) {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { type },
    });

    if (existing) {
      return this.prisma.notificationTemplate.update({
        where: { type },
        data,
      });
    }

    return this.prisma.notificationTemplate.create({
      data: {
        type,
        name: data.name || type,
        inAppTitle: data.inAppTitle || 'Alert',
        inAppBody: data.inAppBody || '',
        ...data,
      } as Prisma.NotificationTemplateCreateInput,
    });
  }

  async getLogs(limit: number = 50, offset: number = 0) {
    return this.prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
