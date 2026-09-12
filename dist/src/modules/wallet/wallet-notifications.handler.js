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
var WalletNotificationsHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletNotificationsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let WalletNotificationsHandler = WalletNotificationsHandler_1 = class WalletNotificationsHandler {
    prisma;
    notifications;
    logger = new common_1.Logger(WalletNotificationsHandler_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async onDepositConfirmed(event) {
        const ctx = await this.resolveContext(event.walletId);
        if (!ctx)
            return;
        await this.notify(ctx.userId, 'DEPOSIT_CREDITED', {
            amount: String(event.amount),
            currency: ctx.currency,
            reference: event.reference,
        });
    }
    async onWithdrawalInitiated(event) {
        const ctx = await this.resolveContext(event.walletId);
        if (!ctx)
            return;
        await this.notify(ctx.userId, 'WITHDRAWAL_REQUESTED', {
            amount: String(event.amount),
            currency: ctx.currency,
            reference: event.reference,
        });
    }
    async onWithdrawalConfirmed(event) {
        const ctx = await this.resolveContext(event.walletId);
        if (!ctx)
            return;
        await this.notify(ctx.userId, 'WITHDRAWAL_COMPLETED', {
            amount: String(event.amount),
            currency: ctx.currency,
            reference: event.reference,
        });
    }
    async onWithdrawalFailed(event) {
        const ctx = await this.resolveContext(event.walletId);
        if (!ctx)
            return;
        await this.notify(ctx.userId, 'WITHDRAWAL_FAILED', {
            amount: String(event.amount),
            currency: ctx.currency,
            reference: event.reference,
        });
    }
    async resolveContext(walletId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
            select: { userId: true, currency: true },
        });
        if (!wallet) {
            this.logger.warn(`Notification skipped: wallet ${walletId} not found`);
            return null;
        }
        return { userId: wallet.userId, currency: wallet.currency };
    }
    async notify(userId, type, data) {
        try {
            await this.notifications.notifyUser({ userId, type, data });
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to send ${type} notification to ${userId}: ${err.message}`);
        }
    }
};
exports.WalletNotificationsHandler = WalletNotificationsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('wallet.deposit.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletNotificationsHandler.prototype, "onDepositConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('wallet.withdrawal.initiated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletNotificationsHandler.prototype, "onWithdrawalInitiated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('wallet.withdrawal.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletNotificationsHandler.prototype, "onWithdrawalConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('wallet.withdrawal.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletNotificationsHandler.prototype, "onWithdrawalFailed", null);
exports.WalletNotificationsHandler = WalletNotificationsHandler = WalletNotificationsHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], WalletNotificationsHandler);
//# sourceMappingURL=wallet-notifications.handler.js.map