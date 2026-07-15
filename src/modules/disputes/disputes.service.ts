import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputeStatus, OrderStatus } from '@src/generated/client';

const VALID_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  [DisputeStatus.OPEN]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.REJECTED,
    DisputeStatus.ESCALATED,
  ],
  [DisputeStatus.UNDER_REVIEW]: [
    DisputeStatus.WAITING_FOR_USER,
    DisputeStatus.WAITING_FOR_ADMIN,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.ESCALATED,
  ],
  [DisputeStatus.WAITING_FOR_USER]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.ESCALATED,
  ],
  [DisputeStatus.WAITING_FOR_ADMIN]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.ESCALATED,
  ],
  [DisputeStatus.RESOLVED]: [],
  [DisputeStatus.REJECTED]: [],
  [DisputeStatus.ESCALATED]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
  ],
};

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createDispute(userId: string, dto: CreateDisputeDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { ad: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('You are not a participant in this order');
      }

      const disputableStatuses: OrderStatus[] = [
        OrderStatus.CREATED,
        OrderStatus.PENDING_SELLER,
        OrderStatus.APPROVED,
      ];

      if (!disputableStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Cannot open dispute for order in ${order.status} status`,
        );
      }

      const existingDispute = await tx.dispute.findFirst({
        where: {
          orderId: dto.orderId,
          status: {
            notIn: [DisputeStatus.RESOLVED, DisputeStatus.REJECTED],
          },
        },
      });

      if (existingDispute) {
        throw new ConflictException('An active dispute already exists for this order');
      }

      const dispute = await tx.dispute.create({
        data: {
          orderId: dto.orderId,
          initiatorId: userId,
          reason: dto.reason,
          description: dto.description,
          status: DisputeStatus.OPEN,
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: {
          status: OrderStatus.DISPUTED,
          version: { increment: 1 },
        },
      });

      this.eventEmitter.emit('dispute.created', { dispute, order });

      return dispute;
    });
  }

  async getUserDisputes(userId: string) {
    return this.prisma.dispute.findMany({
      where: { initiatorId: userId },
      include: {
        order: {
          include: { ad: true },
        },
        evidence: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDispute(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: { ad: true, buyer: true, seller: true },
        },
        initiator: {
          select: { id: true, email: true, profile: true },
        },
        assignee: {
          select: { id: true, email: true, profile: true },
        },
        evidence: {
          include: {
            uploadedBy: {
              select: { id: true, email: true, profile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.initiatorId !== userId) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return dispute;
  }

  async addEvidence(disputeId: string, userId: string, file: Express.Multer.File) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.initiatorId !== userId) {
      throw new ForbiddenException('Only the dispute initiator can upload evidence');
    }

    const terminalStatuses: DisputeStatus[] = [
      DisputeStatus.RESOLVED,
      DisputeStatus.REJECTED,
    ];

    if (terminalStatuses.includes(dispute.status)) {
      throw new BadRequestException('Cannot upload evidence to a closed dispute');
    }

    const fileUrl = this.uploadService.getFileUrl(file.filename);

    const evidence = await this.prisma.evidence.create({
      data: {
        disputeId,
        url: fileUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, email: true, profile: true },
        },
      },
    });

    this.eventEmitter.emit('evidence.uploaded', { evidence, dispute });

    return evidence;
  }

  async listEvidence(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.initiatorId !== userId) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return this.prisma.evidence.findMany({
      where: { disputeId },
      include: {
        uploadedBy: {
          select: { id: true, email: true, profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllDisputes(
    filters?: {
      status?: DisputeStatus;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }
    if (filters?.search) {
      where.OR = [
        { reason: { contains: filters.search, mode: 'insensitive' } },
        { initiator: { email: { contains: filters.search, mode: 'insensitive' } } },
        { order: { id: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: { include: { ad: true } },
          initiator: {
            select: { id: true, email: true, profile: true },
          },
          assignee: {
            select: { id: true, email: true, profile: true },
          },
          evidence: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      disputes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDisputeAdmin(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            ad: true,
            buyer: { include: { profile: true, wallets: true } },
            seller: { include: { profile: true, wallets: true } },
          },
        },
        initiator: {
          select: { id: true, email: true, profile: true },
        },
        assignee: {
          select: { id: true, email: true, profile: true },
        },
        evidence: {
          include: {
            uploadedBy: {
              select: { id: true, email: true, profile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async updateDisputeStatus(
    disputeId: string,
    newStatus: DisputeStatus,
    adminId: string,
    reason?: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const allowed = VALID_TRANSITIONS[dispute.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${dispute.status} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        assigneeId: adminId,
      },
      include: {
        order: true,
        initiator: {
          select: { id: true, email: true, profile: true },
        },
        evidence: true,
      },
    });

    this.eventEmitter.emit('dispute.status_changed', {
      dispute: updated,
      previousStatus: dispute.status,
      adminId,
      reason,
    });

    return updated;
  }

  async assignDispute(disputeId: string, assigneeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException('Admin user not found');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        assigneeId,
        status: DisputeStatus.UNDER_REVIEW,
      },
      include: {
        order: true,
        evidence: true,
      },
    });

    this.eventEmitter.emit('dispute.assigned', { dispute: updated, assigneeId });

    return updated;
  }

  async resolveDispute(
    disputeId: string,
    resolution: string,
    outcome: DisputeStatus,
    resolvedBy: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: disputeId },
        include: { order: true },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      const terminalStatuses: DisputeStatus[] = [
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
      ];

      if (terminalStatuses.includes(dispute.status)) {
        throw new BadRequestException('Dispute is already closed');
      }

      const updated = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: outcome,
          resolution,
          assigneeId: resolvedBy,
        },
        include: {
          order: true,
          initiator: {
            select: { id: true, email: true, profile: true },
          },
          evidence: true,
        },
      });

      if (outcome === DisputeStatus.RESOLVED) {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            status: OrderStatus.COMPLETED,
            version: { increment: 1 },
          },
        });
      } else if (outcome === DisputeStatus.REJECTED) {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            version: { increment: 1 },
          },
        });
      }

      this.eventEmitter.emit('dispute.resolved', {
        dispute: updated,
        resolution,
        outcome,
        resolvedBy,
      });

      return updated;
    });
  }

  async freezeOrder(disputeId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: disputeId },
        include: { order: true },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      const frozenStatuses: OrderStatus[] = [
        OrderStatus.COMPLETED,
        OrderStatus.DECLINED,
        OrderStatus.EXPIRED,
        OrderStatus.CANCELLED,
      ];

      if (frozenStatuses.includes(dispute.order.status)) {
        throw new BadRequestException(
          `Cannot freeze order in ${dispute.order.status} status`,
        );
      }

      const updatedOrder = await tx.order.update({
        where: { id: dispute.orderId },
        data: {
          status: OrderStatus.DISPUTED,
          version: { increment: 1 },
        },
      });

      this.eventEmitter.emit('order.frozen', {
        order: updatedOrder,
        disputeId,
        adminId,
      });

      return updatedOrder;
    });
  }

  async getDisputeStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, byStatus] = await Promise.all([
      this.prisma.dispute.count(),
      this.prisma.dispute.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.dispute.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { _count: { status: 'desc' } },
      }),
    ]);

    const recentResolved = await this.prisma.dispute.findMany({
      where: {
        status: { in: [DisputeStatus.RESOLVED, DisputeStatus.REJECTED] },
        updatedAt: { gte: last7d },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let avgResolutionHours = 0;
    if (recentResolved.length > 0) {
      const totalHours = recentResolved.reduce((sum, d) => {
        return sum + (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = totalHours / recentResolved.length;
    }

    return {
      total,
      last24h: last24hCount,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
    };
  }
}
