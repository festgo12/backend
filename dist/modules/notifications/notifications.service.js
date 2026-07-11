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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const email_service_1 = require("./email.service");
const fcm_service_1 = require("./fcm.service");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    emailService;
    fcmService;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma, emailService, fcmService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.fcmService = fcmService;
    }
    async registerFcmToken(userId, deviceId, fcmToken) {
        this.logger.log(`Registering FCM to device: ${deviceId} for user: ${userId}`);
        return this.prisma.device.upsert({
            where: {
                userId_deviceId: { userId, deviceId },
            },
            update: {
                fcmToken,
                lastLogin: new Date(),
            },
            create: {
                userId,
                deviceId,
                fcmToken,
                fingerprint: 'mobile-fcm-reg',
            },
        });
    }
    async notifyUser(params) {
        const { userId, type, data = {}, customTitle, customBody } = params;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                preferences: true,
                devices: {
                    where: { fcmToken: { not: null } },
                    select: { fcmToken: true },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`Recipient user ${userId} not found.`);
        }
        const template = await this.prisma.notificationTemplate.findUnique({
            where: { type },
        });
        const render = (tpl) => {
            if (tpl)
                return this.emailService.renderTemplate(tpl, data);
            return '';
        };
        const inAppTitle = customTitle || render(template?.inAppTitle) || 'Notification';
        const inAppBody = customBody || render(template?.inAppBody) || 'You have a new message.';
        const emailSubject = render(template?.emailSubject) || inAppTitle;
        const emailBody = render(template?.emailBody) || inAppBody;
        const pushTitle = render(template?.pushTitle) || inAppTitle;
        const pushBody = render(template?.pushBody) || inAppBody;
        const systemBody = render(template?.systemBody) || inAppBody;
        const inAppNotification = await this.prisma.notification.create({
            data: {
                userId,
                title: inAppTitle,
                body: inAppBody,
                data: data ? data : undefined,
            },
        });
        await this.prisma.notificationLog.create({
            data: {
                userId,
                type,
                channel: client_1.NotificationChannel.IN_APP,
                recipient: userId,
                title: inAppTitle,
                body: inAppBody,
                status: client_1.NotificationStatus.SENT,
                nextTryAt: null,
            },
        });
        const isEmailAllowed = user.preferences?.emailNotify ?? true;
        const isPushAllowed = user.preferences?.pushNotify ?? true;
        if (user.email && isEmailAllowed) {
            await this.prisma.notificationLog.create({
                data: {
                    userId,
                    type,
                    channel: client_1.NotificationChannel.EMAIL,
                    recipient: user.email,
                    title: emailSubject,
                    body: emailBody,
                    status: client_1.NotificationStatus.PENDING,
                    nextTryAt: new Date(),
                },
            });
        }
        if (isPushAllowed) {
            for (const dev of user.devices) {
                if (dev.fcmToken) {
                    await this.prisma.notificationLog.create({
                        data: {
                            userId,
                            type,
                            channel: client_1.NotificationChannel.PUSH,
                            recipient: dev.fcmToken,
                            title: pushTitle,
                            body: pushBody,
                            status: client_1.NotificationStatus.PENDING,
                            nextTryAt: new Date(),
                            metadata: data ? data : undefined,
                        },
                    });
                }
            }
        }
        if (template?.systemBody) {
            await this.prisma.notificationLog.create({
                data: {
                    userId,
                    type,
                    channel: client_1.NotificationChannel.SYSTEM,
                    recipient: 'system-console',
                    title: inAppTitle,
                    body: systemBody,
                    status: client_1.NotificationStatus.PENDING,
                    nextTryAt: new Date(),
                },
            });
        }
        return inAppNotification;
    }
    async getNotifications(userId, limit = 20, offset = 0) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
    async markAsRead(userId, notificationId) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async getTemplates() {
        return this.prisma.notificationTemplate.findMany({
            orderBy: { type: 'asc' },
        });
    }
    async createOrUpdateTemplate(type, data) {
        const existing = await this.prisma.notificationTemplate.findUnique({
            where: { type },
        });
        if (existing) {
            return this.prisma.notificationTemplate.update({
                where: { type },
                data,
            });
        }
        return this.prisma.notificationTemplate.create({
            data: {
                type,
                name: data.name || type,
                inAppTitle: data.inAppTitle || 'Alert',
                inAppBody: data.inAppBody || '',
                ...data,
            },
        });
    }
    async getLogs(limit = 50, offset = 0) {
        return this.prisma.notificationLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                    },
                },
            },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        fcm_service_1.FcmService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map