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
var NotificationsQueue_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsQueue = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const email_service_1 = require("./email.service");
const fcm_service_1 = require("./fcm.service");
const client_1 = require("@prisma/client");
let NotificationsQueue = NotificationsQueue_1 = class NotificationsQueue {
    prisma;
    emailService;
    fcmService;
    logger = new common_1.Logger(NotificationsQueue_1.name);
    isProcessing = false;
    constructor(prisma, emailService, fcmService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.fcmService = fcmService;
    }
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const pendingLogs = await this.prisma.notificationLog.findMany({
                where: {
                    status: { in: [client_1.NotificationStatus.PENDING, client_1.NotificationStatus.RETRYING] },
                    nextTryAt: { lte: new Date() },
                },
                take: 20,
            });
            if (pendingLogs.length > 0) {
                this.logger.log(`Processing ${pendingLogs.length} pending notifications from database queue.`);
            }
            for (const log of pendingLogs) {
                await this.dispatchLog(log.id);
            }
        }
        catch (error) {
            this.logger.error(`Error processing notification queue check: ${error.message}`);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async dispatchLog(logId) {
        const log = await this.prisma.notificationLog.findUnique({
            where: { id: logId },
        });
        if (!log)
            return false;
        let success = false;
        let errorDetails;
        try {
            if (log.channel === client_1.NotificationChannel.EMAIL) {
                success = await this.emailService.sendEmail(log.recipient, log.title, log.body);
            }
            else if (log.channel === client_1.NotificationChannel.PUSH) {
                const metadata = log.metadata ? log.metadata : undefined;
                success = await this.fcmService.sendPushNotification(log.recipient, log.title, log.body, metadata);
            }
            else if (log.channel === client_1.NotificationChannel.SYSTEM) {
                success = true;
                this.logger.log(`[SYSTEM ALERT LOG OUT] Channel: SYSTEM | Content: ${log.body}`);
            }
            else if (log.channel === client_1.NotificationChannel.IN_APP) {
                success = true;
            }
        }
        catch (e) {
            errorDetails = e.message;
            success = false;
        }
        if (success) {
            await this.prisma.notificationLog.update({
                where: { id: logId },
                data: {
                    status: client_1.NotificationStatus.SENT,
                    errorDetails: null,
                    nextTryAt: null,
                },
            });
            return true;
        }
        else {
            const nextRetryCount = log.retryCount + 1;
            const isFailedPermanently = nextRetryCount >= log.maxRetries;
            const backoffSec = 30 * Math.pow(2, log.retryCount);
            const nextTryAt = isFailedPermanently
                ? null
                : new Date(Date.now() + backoffSec * 1000);
            await this.prisma.notificationLog.update({
                where: { id: logId },
                data: {
                    status: isFailedPermanently ? client_1.NotificationStatus.FAILED : client_1.NotificationStatus.RETRYING,
                    retryCount: nextRetryCount,
                    nextTryAt,
                    errorDetails: errorDetails || 'Delivery process reported failure/timeout.',
                },
            });
            this.logger.warn(`Failed notification log ${logId} delivery attempt count: ${nextRetryCount}/${log.maxRetries}. ` +
                `Permanently failed: ${isFailedPermanently}`);
            return false;
        }
    }
    async resend(logId) {
        const existing = await this.prisma.notificationLog.findUnique({
            where: { id: logId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Notification log ${logId} not found.`);
        }
        return this.prisma.notificationLog.update({
            where: { id: logId },
            data: {
                status: client_1.NotificationStatus.PENDING,
                retryCount: 0,
                nextTryAt: new Date(),
                errorDetails: null,
            },
        });
    }
};
exports.NotificationsQueue = NotificationsQueue;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsQueue.prototype, "processQueue", null);
exports.NotificationsQueue = NotificationsQueue = NotificationsQueue_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        fcm_service_1.FcmService])
], NotificationsQueue);
//# sourceMappingURL=notifications.queue.js.map