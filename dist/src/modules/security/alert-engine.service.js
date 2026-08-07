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
var AlertEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AlertEngineService = AlertEngineService_1 = class AlertEngineService {
    prisma;
    notificationsService;
    logger = new common_1.Logger(AlertEngineService_1.name);
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async createAlert(params) {
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
        if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
            try {
                await this.notificationsService.notifyUser({
                    userId: params.userId,
                    type: 'SECURITY_ALERT',
                    customTitle: `⚠️ ${params.title}`,
                    customBody: params.message,
                    data: { alertId: alert.id, type: params.type, severity: params.severity },
                });
            }
            catch (error) {
                this.logger.warn(`Failed to send push notification for alert ${alert.id}: ${error.message}`);
            }
        }
        this.logger.log(`Security alert created: ${params.type} [${params.severity}] for user ${params.userId}`);
        return alert;
    }
    async getAlertStats(userId) {
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
};
exports.AlertEngineService = AlertEngineService;
exports.AlertEngineService = AlertEngineService = AlertEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AlertEngineService);
//# sourceMappingURL=alert-engine.service.js.map