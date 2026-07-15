"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DisputesEventsHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesEventsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
let DisputesEventsHandler = DisputesEventsHandler_1 = class DisputesEventsHandler {
    prisma;
    logger = new common_1.Logger(DisputesEventsHandler_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleDisputeCreated(payload) {
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
        const otherPartyId = order.buyerId === dispute.initiatorId ? order.sellerId : order.buyerId;
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
    async handleDisputeStatusChanged(payload) {
        const { dispute, previousStatus, adminId, reason } = payload;
        this.logger.log(`Dispute ${dispute.id} status: ${previousStatus} -> ${dispute.status}`);
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
    async handleDisputeResolved(payload) {
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
            const otherPartyId = order.buyerId === dispute.initiatorId
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
    async handleEvidenceUploaded(payload) {
        const { evidence, dispute } = payload;
        this.logger.log(`Evidence uploaded: ${evidence.id} for dispute: ${dispute.id}`);
        const order = await this.prisma.order.findUnique({
            where: { id: dispute.orderId },
        });
        if (order) {
            const otherPartyId = order.buyerId === dispute.initiatorId
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
    async handleDisputeAssigned(payload) {
        const { dispute, assigneeId } = payload;
        this.logger.log(`Dispute ${dispute.id} assigned to admin: ${assigneeId}`);
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
    async handleOrderFrozen(payload) {
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
};
exports.DisputesEventsHandler = DisputesEventsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('dispute.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleDisputeCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dispute.status_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleDisputeStatusChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dispute.resolved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleDisputeResolved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('evidence.uploaded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleEvidenceUploaded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dispute.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleDisputeAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.frozen'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputesEventsHandler.prototype, "handleOrderFrozen", null);
exports.DisputesEventsHandler = DisputesEventsHandler = DisputesEventsHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DisputesEventsHandler);
//# sourceMappingURL=disputes.events.handler.js.map