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
var SecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
let SecurityService = SecurityService_1 = class SecurityService {
    prisma;
    logger = new common_1.Logger(SecurityService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserDevices(userId) {
        return this.prisma.device.findMany({
            where: { userId },
            orderBy: { lastLogin: 'desc' },
            select: {
                id: true,
                deviceId: true,
                fingerprint: true,
                deviceName: true,
                browser: true,
                osVersion: true,
                location: true,
                ipAddress: true,
                userAgent: true,
                lastLogin: true,
                lastActivity: true,
                createdAt: true,
            },
        });
    }
    async removeDevice(userId, deviceId) {
        const device = await this.prisma.device.findFirst({
            where: { id: deviceId, userId },
        });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return this.prisma.device.delete({
            where: { id: deviceId },
        });
    }
    async removeAllDevices(userId, keepCurrentDeviceId) {
        const where = { userId };
        if (keepCurrentDeviceId) {
            where.id = { not: keepCurrentDeviceId };
        }
        const result = await this.prisma.device.deleteMany({ where });
        return { deletedCount: result.count };
    }
    async updateDeviceActivity(userId, deviceId, metadata) {
        try {
            await this.prisma.device.updateMany({
                where: { userId, deviceId },
                data: {
                    lastActivity: new Date(),
                    ...(metadata.ipAddress && { ipAddress: metadata.ipAddress }),
                    ...(metadata.userAgent && { userAgent: metadata.userAgent }),
                },
            });
        }
        catch {
            this.logger.warn(`Failed to update device activity for ${deviceId}`);
        }
    }
    async getUserSessions(userId) {
        const tokens = await this.prisma.authToken.findMany({
            where: { userId, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                token: true,
                userAgent: true,
                ipAddress: true,
                lastActivity: true,
                expiresAt: true,
                createdAt: true,
            },
        });
        return tokens.map((t) => ({
            id: t.id,
            userAgent: t.userAgent,
            ipAddress: t.ipAddress,
            lastActivity: t.lastActivity,
            expiresAt: t.expiresAt,
            createdAt: t.createdAt,
            isActive: t.expiresAt > new Date(),
        }));
    }
    async revokeSession(userId, tokenId) {
        const token = await this.prisma.authToken.findFirst({
            where: { id: tokenId, userId },
        });
        if (!token)
            throw new common_1.NotFoundException('Session not found');
        await this.prisma.authToken.delete({ where: { id: tokenId } });
        return { success: true };
    }
    async revokeAllSessions(userId, keepCurrentTokenId) {
        const where = { userId };
        if (keepCurrentTokenId) {
            where.id = { not: keepCurrentTokenId };
        }
        const result = await this.prisma.authToken.deleteMany({ where });
        return { deletedCount: result.count };
    }
    async getUserAlerts(userId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (filters.type)
            where.type = filters.type;
        if (filters.severity)
            where.severity = filters.severity;
        if (filters.isRead !== undefined)
            where.isRead = filters.isRead;
        const [alerts, total] = await Promise.all([
            this.prisma.securityAlert.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.securityAlert.count({ where }),
        ]);
        return {
            alerts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async markAlertAsRead(userId, alertId) {
        const alert = await this.prisma.securityAlert.findFirst({
            where: { id: alertId, userId },
        });
        if (!alert)
            throw new common_1.NotFoundException('Alert not found');
        return this.prisma.securityAlert.update({
            where: { id: alertId },
            data: { isRead: true },
        });
    }
    async markAllAlertsAsRead(userId) {
        const result = await this.prisma.securityAlert.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { updatedCount: result.count };
    }
    async getUnreadAlertCount(userId) {
        const count = await this.prisma.securityAlert.count({
            where: { userId, isRead: false },
        });
        return { count };
    }
    async getSecurityScore(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                twoFactorEnabled: true,
                createdAt: true,
                failedLoginAttempts: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const [deviceCount, disputeCount, fraudFlaggedOrders, recentFailedLogins, alertCount,] = await Promise.all([
            this.prisma.device.count({ where: { userId } }),
            this.prisma.dispute.count({ where: { initiatorId: userId } }),
            this.prisma.order.count({
                where: {
                    OR: [{ buyerId: userId }, { sellerId: userId }],
                    fraudFlagged: true,
                },
            }),
            this.prisma.securityLog.count({
                where: {
                    userId,
                    action: { in: ['AUTH_LOGIN', 'AUTH_LOGIN_GOOGLE'] },
                    success: false,
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.securityAlert.count({
                where: { userId, isRead: false },
            }),
        ]);
        let score = 50;
        if (user.twoFactorEnabled)
            score += 20;
        if (deviceCount <= 3)
            score += 10;
        if (deviceCount > 5)
            score -= 10;
        if (disputeCount === 0)
            score += 5;
        if (disputeCount > 3)
            score -= 10;
        if (fraudFlaggedOrders > 0)
            score -= 15;
        if (recentFailedLogins > 3)
            score -= 10;
        if (user.failedLoginAttempts > 0)
            score -= 5;
        if (alertCount > 5)
            score -= 10;
        if (alertCount === 0)
            score += 5;
        const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (accountAgeDays > 30)
            score += 5;
        if (accountAgeDays > 90)
            score += 5;
        score = Math.max(0, Math.min(100, score));
        return {
            score,
            level: score >= 80 ? 'STRONG' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'WEAK',
            factors: {
                twoFactorEnabled: user.twoFactorEnabled,
                deviceCount,
                disputeCount,
                fraudFlaggedOrders,
                recentFailedLogins,
                unreadAlerts: alertCount,
                accountAgeDays,
            },
        };
    }
    parseUserAgent(userAgent) {
        let browser = 'Unknown';
        let osVersion = 'Unknown';
        let deviceName = 'Unknown';
        if (!userAgent)
            return { browser, osVersion, deviceName };
        if (userAgent.includes('Firefox/'))
            browser = 'Firefox';
        else if (userAgent.includes('Edg/'))
            browser = 'Edge';
        else if (userAgent.includes('Chrome/'))
            browser = 'Chrome';
        else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome'))
            browser = 'Safari';
        else if (userAgent.includes('Opera') || userAgent.includes('OPR/'))
            browser = 'Opera';
        if (userAgent.includes('Windows NT 10.0'))
            osVersion = 'Windows 10/11';
        else if (userAgent.includes('Windows NT 6.3'))
            osVersion = 'Windows 8.1';
        else if (userAgent.includes('Windows NT 6.1'))
            osVersion = 'Windows 7';
        else if (userAgent.includes('Mac OS X')) {
            const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
            osVersion = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
        }
        else if (userAgent.includes('Android')) {
            const match = userAgent.match(/Android (\d+[\.\d]*)/);
            osVersion = match ? `Android ${match[1]}` : 'Android';
        }
        else if (userAgent.includes('iPhone OS') || userAgent.includes('iPad')) {
            const match = userAgent.match(/OS (\d+_\d+)/);
            osVersion = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
        }
        else if (userAgent.includes('Linux'))
            osVersion = 'Linux';
        if (userAgent.includes('iPhone'))
            deviceName = 'iPhone';
        else if (userAgent.includes('iPad'))
            deviceName = 'iPad';
        else if (userAgent.includes('Android')) {
            const match = userAgent.match(/;\s*([^;)]+)\s*Build/);
            deviceName = match ? match[1].trim() : 'Android Device';
        }
        else if (userAgent.includes('Mac'))
            deviceName = 'Mac';
        else if (userAgent.includes('Windows'))
            deviceName = 'PC';
        return { browser, osVersion, deviceName };
    }
    async getLocationFromIp(ipAddress) {
        if (!ipAddress || ipAddress === 'unknown' || ipAddress === '127.0.0.1' || ipAddress === '::1') {
            return 'Local';
        }
        try {
            const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city`);
            const data = await response.json();
            if (data.status === 'success') {
                const parts = [data.city, data.regionName, data.country].filter(Boolean);
                return parts.join(', ') || 'Unknown';
            }
        }
        catch {
            this.logger.warn(`IP geolocation failed for ${ipAddress}`);
        }
        return 'Unknown';
    }
};
exports.SecurityService = SecurityService;
exports.SecurityService = SecurityService = SecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SecurityService);
//# sourceMappingURL=security.service.js.map