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
var OrdersEventsHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersEventsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
let OrdersEventsHandler = OrdersEventsHandler_1 = class OrdersEventsHandler {
    prisma;
    logger = new common_1.Logger(OrdersEventsHandler_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleOrderCreated(order) {
        this.logger.log(`Order created: ${order.id}`);
        await this.prisma.notification.create({
            data: {
                userId: order.sellerId,
                title: 'New Buy Order',
                body: `You have a new buy order for ${order.cryptoAmount} NGN. Please approve within 15 minutes.`,
                data: { orderId: order.id },
            },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: order.buyerId,
                action: 'ORDER_CREATED',
                metadata: { orderId: order.id, fiatAmount: order.fiatAmount, cryptoAmount: order.cryptoAmount },
            },
        });
    }
    async handleOrderCompleted(order) {
        this.logger.log(`Order completed: ${order.id}`);
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: order.buyerId,
                    title: 'Order Completed',
                    body: `Your order for ${order.cryptoAmount} has been completed.`,
                    data: { orderId: order.id },
                },
                {
                    userId: order.sellerId,
                    title: 'Order Completed',
                    body: `Your sale for ${order.fiatAmount} NGN has been completed.`,
                    data: { orderId: order.id },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: order.sellerId,
                action: 'ORDER_APPROVED',
                metadata: { orderId: order.id },
            },
        });
    }
    async handleOrderDeclined(payload) {
        const { order, initiatorId } = payload;
        this.logger.log(`Order declined: ${order.id} by ${initiatorId}`);
        const otherPartyId = initiatorId === order.buyerId ? order.sellerId : order.buyerId;
        await this.prisma.notification.create({
            data: {
                userId: otherPartyId,
                title: 'Order Cancelled/Declined',
                body: `The order ${order.id} has been cancelled or declined.`,
                data: { orderId: order.id },
            },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: initiatorId,
                action: 'ORDER_DECLINED',
                metadata: { orderId: order.id },
            },
        });
    }
    async handleOrderExpired(order) {
        this.logger.log(`Order expired: ${order.id}`);
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: order.buyerId,
                    title: 'Order Expired',
                    body: `Your order for ${order.cryptoAmount} has expired.`,
                    data: { orderId: order.id },
                },
                {
                    userId: order.sellerId,
                    title: 'Order Expired',
                    body: `The order for ${order.fiatAmount} NGN has expired.`,
                    data: { orderId: order.id },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: order.buyerId,
                action: 'ORDER_EXPIRED',
                metadata: { orderId: order.id },
            },
        });
    }
    async handleOrderFraudFlagged(payload) {
        const { order, initiatorId } = payload;
        this.logger.warn(`Order ${order.id} flagged as FRAUD by ${initiatorId}`);
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: order.buyerId,
                    title: 'Order Flagged for Fraud',
                    body: `The order ${order.id} has been flagged for fraud and cancelled.`,
                    data: { orderId: order.id },
                },
                {
                    userId: order.sellerId,
                    title: 'Order Flagged for Fraud',
                    body: `The order ${order.id} has been flagged for fraud and cancelled.`,
                    data: { orderId: order.id },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: initiatorId,
                action: 'ORDER_FRAUD_FLAGGED',
                metadata: { orderId: order.id, status: order.status },
            },
        });
    }
};
exports.OrdersEventsHandler = OrdersEventsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('order.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersEventsHandler.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersEventsHandler.prototype, "handleOrderCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.declined'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersEventsHandler.prototype, "handleOrderDeclined", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.expired'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersEventsHandler.prototype, "handleOrderExpired", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.fraud_flagged'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersEventsHandler.prototype, "handleOrderFraudFlagged", null);
exports.OrdersEventsHandler = OrdersEventsHandler = OrdersEventsHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersEventsHandler);
//# sourceMappingURL=orders.events.handler.js.map