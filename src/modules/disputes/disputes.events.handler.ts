import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import type { Dispute, Evidence, Order } from '@src/generated/client';

@Injectable()
export class DisputesEventsHandler {
  private readonly logger = new Logger(DisputesEventsHandler.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('dispute.created')
  async handleDisputeCreated(payload: { dispute: Dispute; order: Order }) {
    const { dispute, order } = payload;
    this.logger.log(`Dispute opened: ${dispute.id} for order: ${order.id}`);

    await this.prisma.notification.create({
      data: {
        userId: dispute.initiatorId,
        title: 'Dispute Opened',
        body: `Your dispute for order #${order.id.slice(0, 8)} has been opened. Our team will review it shortly.`,
        data: { disputeId: dispute.id, orderId: order.id },
      },
    });

    const otherPartyId =
      order.buyerId === dispute.initiatorId ? order.sellerId : order.buyerId;

    await this.prisma.notification.create({
      data: {
        userId: otherPartyId,
        title: 'Dispute Opened Against Your Order',
        body: `A dispute has been opened for order #${order.id.slice(0, 8)}. Please check the details.`,
        data: { disputeId: dispute.id, orderId: order.id },
      },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: dispute.initiatorId,
        action: 'DISPUTE_OPENED',
        resource: 'DISPUTE',
        resourceId: dispute.id,
        metadata: { orderId: order.id, reason: dispute.reason },
      },
    });
  }

  @OnEvent('dispute.status_changed')
  async handleDisputeStatusChanged(payload: {
    dispute: Dispute & { order: Order; initiator: any; evidence: any[] };
    previousStatus: string;
    adminId: string;
    reason?: string;
  }) {
    const { dispute, previousStatus, adminId, reason } = payload;
    this.logger.log(
      `Dispute ${dispute.id} status: ${previousStatus} -> ${dispute.status}`,
    );

    await this.prisma.notification.create({
      data: {
        userId: dispute.initiatorId,
        title: 'Dispute Status Updated',
        body: `Your dispute status has changed from ${previousStatus} to ${dispute.status}.${reason ? ` Reason: ${reason}` : ''}`,
        data: { disputeId: dispute.id, status: dispute.status },
      },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: adminId,
        action: 'DISPUTE_STATUS_CHANGED',
        resource: 'DISPUTE',
        resourceId: dispute.id,
        oldValue: { status: previousStatus },
        newValue: { status: dispute.status, reason },
        metadata: { orderId: dispute.orderId },
      },
    });
  }

  @OnEvent('dispute.resolved')
  async handleDisputeResolved(payload: {
    dispute: Dispute & { order: Order; initiator: any };
    resolution: string;
    outcome: string;
    resolvedBy: string;
  }) {
    const { dispute, resolution, outcome, resolvedBy } = payload;
    this.logger.log(`Dispute ${dispute.id} resolved with outcome: ${outcome}`);

    await this.prisma.notification.create({
      data: {
        userId: dispute.initiatorId,
        title: `Dispute ${outcome === 'RESOLVED' ? 'Resolved' : 'Rejected'}`,
        body: `Your dispute has been ${outcome.toLowerCase()}. Resolution: ${resolution}`,
        data: { disputeId: dispute.id, outcome, resolution },
      },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: dispute.orderId },
    });

    if (order) {
      const otherPartyId =
        order.buyerId === dispute.initiatorId
          ? order.sellerId
          : order.buyerId;

      await this.prisma.notification.create({
        data: {
          userId: otherPartyId,
          title: `Dispute ${outcome === 'RESOLVED' ? 'Resolved' : 'Rejected'}`,
          body: `The dispute for order #${order.id.slice(0, 8)} has been ${outcome.toLowerCase()}.`,
          data: { disputeId: dispute.id, orderId: order.id, outcome },
        },
      });
    }

    await this.prisma.securityLog.create({
      data: {
        userId: resolvedBy,
        action: 'DISPUTE_RESOLVED',
        resource: 'DISPUTE',
        resourceId: dispute.id,
        newValue: { outcome, resolution },
        metadata: { orderId: dispute.orderId },
      },
    });
  }

  @OnEvent('evidence.uploaded')
  async handleEvidenceUploaded(payload: {
    evidence: Evidence & { uploadedBy: any };
    dispute: Dispute;
  }) {
    const { evidence, dispute } = payload;
    this.logger.log(
      `Evidence uploaded: ${evidence.id} for dispute: ${dispute.id}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: dispute.orderId },
    });

    if (order) {
      const otherPartyId =
        order.buyerId === dispute.initiatorId
          ? order.sellerId
          : order.buyerId;

      await this.prisma.notification.create({
        data: {
          userId: otherPartyId,
          title: 'New Evidence Submitted',
          body: `New evidence has been submitted for dispute #${dispute.id.slice(0, 8)}.`,
          data: { disputeId: dispute.id, evidenceId: evidence.id },
        },
      });
    }

    await this.prisma.securityLog.create({
      data: {
        userId: evidence.uploadedById,
        action: 'EVIDENCE_UPLOADED',
        resource: 'EVIDENCE',
        resourceId: evidence.id,
        metadata: {
          disputeId: dispute.id,
          fileName: evidence.fileName,
          fileType: evidence.fileType,
        },
      },
    });
  }

  @OnEvent('dispute.assigned')
  async handleDisputeAssigned(payload: {
    dispute: Dispute & { order: Order };
    assigneeId: string;
  }) {
    const { dispute, assigneeId } = payload;
    this.logger.log(
      `Dispute ${dispute.id} assigned to admin: ${assigneeId}`,
    );

    await this.prisma.notification.create({
      data: {
        userId: dispute.initiatorId,
        title: 'Dispute Under Review',
        body: `Your dispute has been assigned to a support agent and is now under review.`,
        data: { disputeId: dispute.id },
      },
    });

    await this.prisma.securityLog.create({
      data: {
        userId: assigneeId,
        action: 'DISPUTE_ASSIGNED',
        resource: 'DISPUTE',
        resourceId: dispute.id,
        metadata: { orderId: dispute.orderId },
      },
    });
  }

  @OnEvent('order.frozen')
  async handleOrderFrozen(payload: {
    order: Order;
    disputeId: string;
    adminId: string;
  }) {
    const { order, disputeId, adminId } = payload;
    this.logger.warn(`Order ${order.id} frozen by admin ${adminId}`);

    await this.prisma.notification.createMany({
      data: [
        {
          userId: order.buyerId,
          title: 'Order Frozen',
          body: `Order #${order.id.slice(0, 8)} has been frozen due to an active dispute.`,
          data: { orderId: order.id, disputeId },
        },
        {
          userId: order.sellerId,
          title: 'Order Frozen',
          body: `Order #${order.id.slice(0, 8)} has been frozen due to an active dispute.`,
          data: { orderId: order.id, disputeId },
        },
      ],
    });

    await this.prisma.securityLog.create({
      data: {
        userId: adminId,
        action: 'ORDER_FROZEN',
        resource: 'ORDER',
        resourceId: order.id,
        metadata: { disputeId },
      },
    });
  }
}
