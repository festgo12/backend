import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditParams } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditParams): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId: params.userId,
          actorId: params.actorId || null,
          action: params.action,
          resource: params.resource || null,
          resourceId: params.resourceId || null,
          oldValue: params.oldValue || undefined,
          newValue: params.newValue || undefined,
          metadata: params.metadata || undefined,
          ipAddress: params.ipAddress || null,
          device: params.device || null,
          success: params.success ?? true,
          errorMessage: params.errorMessage || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }
}
