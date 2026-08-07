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
var RiskEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
let RiskEngineService = RiskEngineService_1 = class RiskEngineService {
    prisma;
    logger = new common_1.Logger(RiskEngineService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateUserRiskScore(userId) {
        const [user, deviceCount, recentFailedLogins, disputeCount, fraudFlaggedOrders, recentWithdrawalCount, alertCount,] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    createdAt: true,
                    failedLoginAttempts: true,
                    status: true,
                },
            }),
            this.prisma.device.count({ where: { userId } }),
            this.prisma.securityLog.count({
                where: {
                    userId,
                    action: { in: ['AUTH_LOGIN', 'AUTH_LOGIN_GOOGLE'] },
                    success: false,
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.dispute.count({ where: { initiatorId: userId } }),
            this.prisma.order.count({
                where: {
                    OR: [{ buyerId: userId }, { sellerId: userId }],
                    fraudFlagged: true,
                },
            }),
            this.prisma.walletTransaction.count({
                where: {
                    wallet: { userId },
                    type: 'WITHDRAWAL',
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.securityAlert.count({ where: { userId } }),
        ]);
        if (!user)
            return { score: 0, level: 'UNKNOWN', signals: {} };
        const signals = {};
        const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        signals.accountAge = accountAgeDays < 7 ? 30 : accountAgeDays < 30 ? 15 : 0;
        signals.accountStatus = user.status === 'SUSPENDED' ? 40 : user.status === 'FROZEN' ? 20 : 0;
        signals.failedLogins = recentFailedLogins > 5 ? 25 : recentFailedLogins > 2 ? 15 : recentFailedLogins > 0 ? 5 : 0;
        signals.failedLogins += user.failedLoginAttempts > 0 ? 10 : 0;
        signals.deviceCount = deviceCount > 10 ? 20 : deviceCount > 5 ? 10 : 0;
        signals.fraudFlags = fraudFlaggedOrders > 0 ? 30 : 0;
        signals.disputes = disputeCount > 5 ? 15 : disputeCount > 2 ? 10 : disputeCount > 0 ? 5 : 0;
        signals.withdrawalVelocity = recentWithdrawalCount > 5 ? 20 : recentWithdrawalCount > 3 ? 10 : 0;
        signals.alertHistory = alertCount > 10 ? 15 : alertCount > 5 ? 10 : alertCount > 0 ? 5 : 0;
        const rawRisk = Object.values(signals).reduce((sum, v) => sum + v, 0);
        const maxPossible = 180;
        const riskScore = Math.min(100, Math.round((rawRisk / maxPossible) * 100));
        const safetyScore = 100 - riskScore;
        return {
            score: safetyScore,
            level: safetyScore >= 80 ? 'LOW' : safetyScore >= 50 ? 'MEDIUM' : safetyScore >= 25 ? 'HIGH' : 'CRITICAL',
            signals,
        };
    }
    async getAdminRiskOverview() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalUsers, frozenUsers, suspendedUsers, usersWith2FA, recentFailedLogins, fraudFlaggedOrders, recentDisputes, alertsBySeverity,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { status: 'FROZEN' } }),
            this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
            this.prisma.user.count({ where: { twoFactorEnabled: true } }),
            this.prisma.securityLog.count({
                where: {
                    action: { in: ['AUTH_LOGIN'] },
                    success: false,
                    createdAt: { gte: last24h },
                },
            }),
            this.prisma.order.count({
                where: { fraudFlagged: true, createdAt: { gte: last7d } },
            }),
            this.prisma.dispute.count({
                where: { createdAt: { gte: last7d } },
            }),
            this.prisma.securityAlert.groupBy({
                by: ['severity'],
                _count: { severity: true },
            }),
        ]);
        return {
            users: {
                total: totalUsers,
                frozen: frozenUsers,
                suspended: suspendedUsers,
                with2FA: usersWith2FA,
                twoFaRate: totalUsers > 0 ? Math.round((usersWith2FA / totalUsers) * 100) : 0,
            },
            threats: {
                failedLogins24h: recentFailedLogins,
                fraudFlaggedOrders7d: fraudFlaggedOrders,
                disputes7d: recentDisputes,
            },
            alerts: {
                bySeverity: alertsBySeverity.map((s) => ({
                    severity: s.severity,
                    count: s._count.severity,
                })),
            },
        };
    }
};
exports.RiskEngineService = RiskEngineService;
exports.RiskEngineService = RiskEngineService = RiskEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskEngineService);
//# sourceMappingURL=risk-engine.service.js.map