import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createAlert(params: CreateAlertParams) {
    // Dedup: check if an identical unread alert exists in the last hour
    const recentDuplicate = await this.prisma.securityAlert.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentDuplicate) {
      this.logger.debug(`Skipping duplicate alert: ${params.type} for user ${params.userId}`);
      return recentDuplicate;
    }

    const alert = await this.prisma.securityAlert.create({
      data: {
        userId: params.userId,
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        metadata: params.metadata || undefined,
      },
    });

    // Send push notification for HIGH/CRITICAL alerts
    if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
      try {
        await this.notificationsService.notifyUser({
          userId: params.userId,
          type: 'SECURITY_ALERT',
          customTitle: `⚠️ ${params.title}`,
          customBody: params.message,
          data: { alertId: alert.id, type: params.type, severity: params.severity },
        });
      } catch (error) {
        this.logger.warn(`Failed to send push notification for alert ${alert.id}: ${error.message}`);
      }
    }

    this.logger.log(`Security alert created: ${params.type} [${params.severity}] for user ${params.userId}`);
    return alert;
  }

  async getAlertStats(userId: string) {
    const [total, unread, bySeverity, byType] = await Promise.all([
      this.prisma.securityAlert.count({ where: { userId } }),
      this.prisma.securityAlert.count({ where: { userId, isRead: false } }),
      this.prisma.securityAlert.groupBy({
        by: ['severity'],
        where: { userId },
        _count: { severity: true },
      }),
      this.prisma.securityAlert.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      total,
      unread,
      bySeverity: bySeverity.map((s) => ({
        severity: s.severity,
        count: s._count.severity,
      })),
      topTypes: byType.map((t) => ({
        type: t.type,
        count: t._count.type,
      })),
    };
  }
}
