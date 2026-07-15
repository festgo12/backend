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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const upload_service_1 = require("../upload/upload.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("../../generated/client/index.js");
const VALID_TRANSITIONS = {
    [client_1.DisputeStatus.OPEN]: [
        client_1.DisputeStatus.UNDER_REVIEW,
        client_1.DisputeStatus.REJECTED,
        client_1.DisputeStatus.ESCALATED,
    ],
    [client_1.DisputeStatus.UNDER_REVIEW]: [
        client_1.DisputeStatus.WAITING_FOR_USER,
        client_1.DisputeStatus.WAITING_FOR_ADMIN,
        client_1.DisputeStatus.RESOLVED,
        client_1.DisputeStatus.REJECTED,
        client_1.DisputeStatus.ESCALATED,
    ],
    [client_1.DisputeStatus.WAITING_FOR_USER]: [
        client_1.DisputeStatus.UNDER_REVIEW,
        client_1.DisputeStatus.RESOLVED,
        client_1.DisputeStatus.REJECTED,
        client_1.DisputeStatus.ESCALATED,
    ],
    [client_1.DisputeStatus.WAITING_FOR_ADMIN]: [
        client_1.DisputeStatus.UNDER_REVIEW,
        client_1.DisputeStatus.RESOLVED,
        client_1.DisputeStatus.REJECTED,
        client_1.DisputeStatus.ESCALATED,
    ],
    [client_1.DisputeStatus.RESOLVED]: [],
    [client_1.DisputeStatus.REJECTED]: [],
    [client_1.DisputeStatus.ESCALATED]: [
        client_1.DisputeStatus.UNDER_REVIEW,
        client_1.DisputeStatus.RESOLVED,
        client_1.DisputeStatus.REJECTED,
    ],
};
let DisputesService = class DisputesService {
    prisma;
    uploadService;
    eventEmitter;
    constructor(prisma, uploadService, eventEmitter) {
        this.prisma = prisma;
        this.uploadService = uploadService;
        this.eventEmitter = eventEmitter;
    }
    async createDispute(userId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: dto.orderId },
                include: { ad: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.buyerId !== userId && order.sellerId !== userId) {
                throw new common_1.ForbiddenException('You are not a participant in this order');
            }
            const disputableStatuses = [
                client_1.OrderStatus.CREATED,
                client_1.OrderStatus.PENDING_SELLER,
                client_1.OrderStatus.APPROVED,
            ];
            if (!disputableStatuses.includes(order.status)) {
                throw new common_1.BadRequestException(`Cannot open dispute for order in ${order.status} status`);
            }
            const existingDispute = await tx.dispute.findFirst({
                where: {
                    orderId: dto.orderId,
                    status: {
                        notIn: [client_1.DisputeStatus.RESOLVED, client_1.DisputeStatus.REJECTED],
                    },
                },
            });
            if (existingDispute) {
                throw new common_1.ConflictException('An active dispute already exists for this order');
            }
            const dispute = await tx.dispute.create({
                data: {
                    orderId: dto.orderId,
                    initiatorId: userId,
                    reason: dto.reason,
                    description: dto.description,
                    status: client_1.DisputeStatus.OPEN,
                },
            });
            await tx.order.update({
                where: { id: dto.orderId },
                data: {
                    status: client_1.OrderStatus.DISPUTED,
                    version: { increment: 1 },
                },
            });
            this.eventEmitter.emit('dispute.created', { dispute, order });
            return dispute;
        });
    }
    async getUserDisputes(userId) {
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
    async getDispute(disputeId, userId) {
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
            throw new common_1.NotFoundException('Dispute not found');
        }
        if (dispute.initiatorId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this dispute');
        }
        return dispute;
    }
    async addEvidence(disputeId, userId, file) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        if (dispute.initiatorId !== userId) {
            throw new common_1.ForbiddenException('Only the dispute initiator can upload evidence');
        }
        const terminalStatuses = [
            client_1.DisputeStatus.RESOLVED,
            client_1.DisputeStatus.REJECTED,
        ];
        if (terminalStatuses.includes(dispute.status)) {
            throw new common_1.BadRequestException('Cannot upload evidence to a closed dispute');
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
    async listEvidence(disputeId, userId) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        if (dispute.initiatorId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this dispute');
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
    async listAllDisputes(filters, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {};
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
    async getDisputeAdmin(disputeId) {
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
            throw new common_1.NotFoundException('Dispute not found');
        }
        return dispute;
    }
    async updateDisputeStatus(disputeId, newStatus, adminId, reason) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        const allowed = VALID_TRANSITIONS[dispute.status];
        if (!allowed.includes(newStatus)) {
            throw new common_1.BadRequestException(`Cannot transition from ${dispute.status} to ${newStatus}`);
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
    async assignDispute(disputeId, assigneeId) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        const assignee = await this.prisma.user.findUnique({
            where: { id: assigneeId },
        });
        if (!assignee) {
            throw new common_1.NotFoundException('Admin user not found');
        }
        const updated = await this.prisma.dispute.update({
            where: { id: disputeId },
            data: {
                assigneeId,
                status: client_1.DisputeStatus.UNDER_REVIEW,
            },
            include: {
                order: true,
                evidence: true,
            },
        });
        this.eventEmitter.emit('dispute.assigned', { dispute: updated, assigneeId });
        return updated;
    }
    async resolveDispute(disputeId, resolution, outcome, resolvedBy) {
        return this.prisma.$transaction(async (tx) => {
            const dispute = await tx.dispute.findUnique({
                where: { id: disputeId },
                include: { order: true },
            });
            if (!dispute) {
                throw new common_1.NotFoundException('Dispute not found');
            }
            const terminalStatuses = [
                client_1.DisputeStatus.RESOLVED,
                client_1.DisputeStatus.REJECTED,
            ];
            if (terminalStatuses.includes(dispute.status)) {
                throw new common_1.BadRequestException('Dispute is already closed');
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
            if (outcome === client_1.DisputeStatus.RESOLVED) {
                await tx.order.update({
                    where: { id: dispute.orderId },
                    data: {
                        status: client_1.OrderStatus.COMPLETED,
                        version: { increment: 1 },
                    },
                });
            }
            else if (outcome === client_1.DisputeStatus.REJECTED) {
                await tx.order.update({
                    where: { id: dispute.orderId },
                    data: {
                        status: client_1.OrderStatus.CANCELLED,
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
    async freezeOrder(disputeId, adminId) {
        return this.prisma.$transaction(async (tx) => {
            const dispute = await tx.dispute.findUnique({
                where: { id: disputeId },
                include: { order: true },
            });
            if (!dispute) {
                throw new common_1.NotFoundException('Dispute not found');
            }
            const frozenStatuses = [
                client_1.OrderStatus.COMPLETED,
                client_1.OrderStatus.DECLINED,
                client_1.OrderStatus.EXPIRED,
                client_1.OrderStatus.CANCELLED,
            ];
            if (frozenStatuses.includes(dispute.order.status)) {
                throw new common_1.BadRequestException(`Cannot freeze order in ${dispute.order.status} status`);
            }
            const updatedOrder = await tx.order.update({
                where: { id: dispute.orderId },
                data: {
                    status: client_1.OrderStatus.DISPUTED,
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
                status: { in: [client_1.DisputeStatus.RESOLVED, client_1.DisputeStatus.REJECTED] },
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
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        upload_service_1.UploadService,
        event_emitter_1.EventEmitter2])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map