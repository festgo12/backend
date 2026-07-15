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
var FraudRulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudRulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const alert_engine_service_1 = require("./alert-engine.service");
const DEFAULT_RULES = [
    {
        code: 'MULTIPLE_ACCOUNTS_SAME_DEVICE',
        name: 'Multiple Accounts Same Device',
        description: 'Detects when multiple user accounts are logged into from the same device fingerprint',
        threshold: 2,
        severity: 'HIGH',
        action: 'ALERT',
    },
    {
        code: 'RAPID_WITHDRAWALS',
        name: 'Rapid Withdrawals',
        description: 'Detects when a user makes multiple withdrawal transactions in rapid succession',
        threshold: 3,
        severity: 'HIGH',
        action: 'ALERT',
    },
    {
        code: 'UNUSUAL_VOLUME',
        name: 'Unusual Trading Volume',
        description: 'Detects when trading volume significantly exceeds the user\'s historical average',
        threshold: 3,
        severity: 'MEDIUM',
        action: 'ALERT',
    },
    {
        code: 'SUSPICIOUS_WALLET_ADDRESS',
        name: 'Suspicious Wallet Address',
        description: 'Detects interaction with known suspicious or blacklisted wallet addresses',
        threshold: 1,
        severity: 'CRITICAL',
        action: 'FREEZE',
    },
    {
        code: 'FAILED_LOGIN_BURST',
        name: 'Failed Login Burst',
        description: 'Detects multiple failed login attempts in a short time window',
        threshold: 5,
        severity: 'HIGH',
        action: 'ALERT',
    },
    {
        code: 'NEW_DEVICE_LOGIN',
        name: 'New Device Login',
        description: 'Alerts when a login occurs from a device not previously seen for this user',
        threshold: 1,
        severity: 'LOW',
        action: 'ALERT',
    },
];
let FraudRulesService = FraudRulesService_1 = class FraudRulesService {
    prisma;
    alertEngine;
    logger = new common_1.Logger(FraudRulesService_1.name);
    constructor(prisma, alertEngine) {
        this.prisma = prisma;
        this.alertEngine = alertEngine;
    }
    async onModuleInit() {
        await this.seedDefaultRules();
    }
    async seedDefaultRules() {
        for (const rule of DEFAULT_RULES) {
            await this.prisma.fraudRule.upsert({
                where: { code: rule.code },
                update: {},
                create: {
                    name: rule.name,
                    code: rule.code,
                    description: rule.description,
                    threshold: rule.threshold,
                    severity: rule.severity,
                    action: rule.action,
                },
            });
        }
        this.logger.log('Fraud rules seeded successfully');
    }
    async getAllRules() {
        return this.prisma.fraudRule.findMany({
            orderBy: { createdAt: 'asc' },
        });
    }
    async updateRule(ruleId, data) {
        const rule = await this.prisma.fraudRule.findUnique({ where: { id: ruleId } });
        if (!rule)
            return null;
        return this.prisma.fraudRule.update({
            where: { id: ruleId },
            data,
        });
    }
    async getRuleByCode(code) {
        return this.prisma.fraudRule.findUnique({ where: { code } });
    }
    async evaluateMultipleAccountsSameDevice(userId, deviceId) {
        const rule = await this.getRuleByCode('MULTIPLE_ACCOUNTS_SAME_DEVICE');
        if (!rule || !rule.enabled)
            return;
        const accountsOnDevice = await this.prisma.device.findMany({
            where: { deviceId },
            select: { userId: true },
            distinct: ['userId'],
        });
        const uniqueUserIds = [...new Set(accountsOnDevice.map((d) => d.userId))];
        if (uniqueUserIds.length >= rule.threshold) {
            await this.alertEngine.createAlert({
                userId,
                type: rule.code,
                severity: rule.severity,
                title: 'Multiple Accounts on Same Device',
                message: `${uniqueUserIds.length} accounts have been logged into from this device. This may indicate fraudulent activity.`,
                metadata: { accountCount: uniqueUserIds.length, userIds: uniqueUserIds },
            });
        }
    }
    async evaluateRapidWithdrawals(userId) {
        const rule = await this.getRuleByCode('RAPID_WITHDRAWALS');
        if (!rule || !rule.enabled)
            return;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentWithdrawals = await this.prisma.walletTransaction.count({
            where: {
                wallet: { userId },
                type: 'WITHDRAWAL',
                createdAt: { gte: oneHourAgo },
            },
        });
        if (recentWithdrawals >= rule.threshold) {
            await this.alertEngine.createAlert({
                userId,
                type: rule.code,
                severity: rule.severity,
                title: 'Rapid Withdrawals Detected',
                message: `${recentWithdrawals} withdrawals have been made in the last hour. This is unusually high activity.`,
                metadata: { withdrawalCount: recentWithdrawals, windowMinutes: 60 },
            });
        }
    }
    async evaluateUnusualVolume(userId) {
        const rule = await this.getRuleByCode('UNUSUAL_VOLUME');
        if (!rule || !rule.enabled)
            return;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [historicalCount, recentCount] = await Promise.all([
            this.prisma.order.count({
                where: {
                    OR: [{ buyerId: userId }, { sellerId: userId }],
                    createdAt: { gte: thirtyDaysAgo, lt: oneDayAgo },
                },
            }),
            this.prisma.order.count({
                where: {
                    OR: [{ buyerId: userId }, { sellerId: userId }],
                    createdAt: { gte: oneDayAgo },
                },
            }),
        ]);
        const dailyAverage = historicalCount / 30;
        if (dailyAverage > 0 && recentCount >= dailyAverage * rule.threshold) {
            await this.alertEngine.createAlert({
                userId,
                type: rule.code,
                severity: rule.severity,
                title: 'Unusual Trading Volume',
                message: `Your recent trading volume (${recentCount} orders today) significantly exceeds your daily average (${dailyAverage.toFixed(1)}).`,
                metadata: { recentCount, dailyAverage: Math.round(dailyAverage * 10) / 10 },
            });
        }
    }
    async evaluateNewDeviceLogin(userId, deviceId, ipAddress) {
        const rule = await this.getRuleByCode('NEW_DEVICE_LOGIN');
        if (!rule || !rule.enabled)
            return;
        const existingDevice = await this.prisma.device.findFirst({
            where: { userId, deviceId, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        });
        if (!existingDevice) {
            await this.alertEngine.createAlert({
                userId,
                type: rule.code,
                severity: rule.severity,
                title: 'New Device Login',
                message: `A login was detected from a new device. If this wasn't you, please secure your account immediately.`,
                metadata: { deviceId, ipAddress },
            });
        }
    }
    async evaluateFailedLoginBurst(email, ipAddress) {
        const rule = await this.getRuleByCode('FAILED_LOGIN_BURST');
        if (!rule || !rule.enabled)
            return;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const failedCount = await this.prisma.securityLog.count({
            where: {
                action: { in: ['AUTH_LOGIN', 'AUTH_LOGIN_GOOGLE'] },
                success: false,
                metadata: { path: ['email'], equals: email },
                createdAt: { gte: fifteenMinutesAgo },
            },
        });
        if (failedCount >= rule.threshold - 1) {
            const user = await this.prisma.user.findFirst({ where: { email } });
            if (user) {
                await this.alertEngine.createAlert({
                    userId: user.id,
                    type: rule.code,
                    severity: rule.severity,
                    title: 'Suspicious Login Attempts',
                    message: `${failedCount + 1} failed login attempts have been detected for your account in the last 15 minutes.`,
                    metadata: { failedCount: failedCount + 1, ipAddress, email },
                });
            }
        }
    }
};
exports.FraudRulesService = FraudRulesService;
exports.FraudRulesService = FraudRulesService = FraudRulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alert_engine_service_1.AlertEngineService])
], FraudRulesService);
//# sourceMappingURL=fraud-rules.service.js.map