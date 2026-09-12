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
var GiftCardStoreEventsHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardStoreEventsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let GiftCardStoreEventsHandler = GiftCardStoreEventsHandler_1 = class GiftCardStoreEventsHandler {
    prisma;
    notifications;
    logger = new common_1.Logger(GiftCardStoreEventsHandler_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async handleOrderPending(payload) {
        const { order } = payload;
        this.logger.log(`Gift card store order pending delivery: ${order.id}`);
        await this.notifications.notifyUser({
            userId: order.userId,
            type: 'GIFT_CARD_STORE_ORDER_PENDING',
            customTitle: 'Gift Card Order Placed',
            customBody: 'Your gift card order has been placed. Your claim link will appear in your gift cards shortly.',
            data: { orderId: order.id, amount: order.sellPriceNgn },
        });
    }
    async handleOrderCompleted(payload) {
        const { order } = payload;
        this.logger.log(`Gift card store order delivered: ${order.id}`);
        await this.notifications.notifyUser({
            userId: order.userId,
            type: 'GIFT_CARD_STORE_ORDER_COMPLETED',
            customTitle: 'Gift Card Delivered',
            customBody: `Your ${order.productName || 'gift card'} is ready. Tap to open and claim your card.`,
            data: { orderId: order.id, amount: order.amount },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: order.userId,
                action: 'GIFT_CARD_STORE_ORDER_COMPLETED',
                metadata: { orderId: order.id },
            },
        });
    }
    async handleOrderFailed(payload) {
        const { order } = payload;
        this.logger.log(`Gift card store order failed: ${order.id}`);
        await this.notifications.notifyUser({
            userId: order.userId,
            type: 'GIFT_CARD_STORE_ORDER_FAILED',
            customTitle: 'Gift Card Order Failed',
            customBody: 'Your gift card order could not be fulfilled and has been refunded to your wallet. Please try again.',
            data: { orderId: order.id },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: order.userId,
                action: 'GIFT_CARD_STORE_ORDER_FAILED',
                metadata: { orderId: order.id, reason: order.message },
            },
        });
    }
};
exports.GiftCardStoreEventsHandler = GiftCardStoreEventsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('gift-card-store.order.pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardStoreEventsHandler.prototype, "handleOrderPending", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift-card-store.order.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardStoreEventsHandler.prototype, "handleOrderCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift-card-store.order.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardStoreEventsHandler.prototype, "handleOrderFailed", null);
exports.GiftCardStoreEventsHandler = GiftCardStoreEventsHandler = GiftCardStoreEventsHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], GiftCardStoreEventsHandler);
//# sourceMappingURL=gift-card-store.events.handler.js.map