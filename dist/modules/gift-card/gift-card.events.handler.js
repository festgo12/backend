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
var GiftCardEventsHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardEventsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
let GiftCardEventsHandler = GiftCardEventsHandler_1 = class GiftCardEventsHandler {
    prisma;
    logger = new common_1.Logger(GiftCardEventsHandler_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleListingCreated(listing) {
        this.logger.log(`Gift card listing created: ${listing.id}`);
        await this.prisma.securityLog.create({
            data: {
                userId: listing.sellerId,
                action: 'GIFT_CARD_LISTING_CREATED',
                metadata: {
                    listingId: listing.id,
                    brand: listing.brand,
                    askingPriceNgn: listing.askingPriceNgn,
                },
            },
        });
    }
    async handleListingApproved(payload) {
        const { listing, moderatorId } = payload;
        this.logger.log(`Gift card listing approved: ${listing.id} by ${moderatorId}`);
        await this.prisma.notification.create({
            data: {
                userId: listing.sellerId,
                title: 'Gift Card Listing Approved',
                body: `Your ${listing.brand} gift card listing has been approved and is now live in the marketplace.`,
                data: { listingId: listing.id, type: 'GIFT_CARD_LISTING_APPROVED' },
            },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: moderatorId,
                action: 'GIFT_CARD_LISTING_APPROVED',
                metadata: { listingId: listing.id },
            },
        });
    }
    async handleListingRejected(payload) {
        const { listing, moderatorId } = payload;
        this.logger.log(`Gift card listing rejected: ${listing.id} by ${moderatorId}`);
        await this.prisma.notification.create({
            data: {
                userId: listing.sellerId,
                title: 'Gift Card Listing Rejected',
                body: `Your ${listing.brand} gift card listing was rejected.${listing.moderatorNote ? ` Reason: ${listing.moderatorNote}` : ''}`,
                data: { listingId: listing.id, type: 'GIFT_CARD_LISTING_REJECTED' },
            },
        });
        await this.prisma.securityLog.create({
            data: {
                userId: moderatorId,
                action: 'GIFT_CARD_LISTING_REJECTED',
                metadata: { listingId: listing.id, reason: listing.moderatorNote },
            },
        });
    }
    async handleOrderCreated(payload) {
        const { order, buyerId, sellerId } = payload;
        this.logger.log(`Gift card order created: ${order.id}`);
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: buyerId,
                    title: 'Gift Card Purchase Confirmed',
                    body: `Your gift card purchase has been confirmed. Please confirm receipt once you've received the card.`,
                    data: { orderId: order.id, type: 'GIFT_CARD_PURCHASE_CONFIRMED' },
                },
                {
                    userId: sellerId,
                    title: 'Gift Card Sold',
                    body: `Your gift card has been purchased! Funds will be released upon buyer confirmation.`,
                    data: { orderId: order.id, type: 'GIFT_CARD_SOLD' },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: buyerId,
                action: 'GIFT_CARD_ORDER_CREATED',
                metadata: {
                    orderId: order.id,
                    listingId: order.listingId,
                    amount: order.totalPaidNgn,
                },
            },
        });
    }
    async handleOrderCompleted(payload) {
        const { order, buyerId, sellerId } = payload;
        this.logger.log(`Gift card order completed: ${order.id}`);
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: buyerId,
                    title: 'Gift Card Received',
                    body: `Your gift card code is now available. Thank you for your purchase!`,
                    data: { orderId: order.id, type: 'GIFT_CARD_COMPLETED' },
                },
                {
                    userId: sellerId,
                    title: 'Gift Card Sale Completed',
                    body: `The buyer has confirmed receipt. Your funds have been released.`,
                    data: { orderId: order.id, type: 'GIFT_CARD_SALE_COMPLETED' },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: buyerId,
                action: 'GIFT_CARD_ORDER_COMPLETED',
                metadata: {
                    orderId: order.id,
                    amount: order.totalPaidNgn || order.askingPriceNgn,
                },
            },
        });
    }
    async handleOrderCancelled(payload) {
        const { order, cancelledBy } = payload;
        this.logger.log(`Gift card order cancelled: ${order.id} by ${cancelledBy}`);
        const otherPartyId = cancelledBy === order.buyerId ? order.sellerId : order.buyerId;
        await this.prisma.notification.createMany({
            data: [
                {
                    userId: order.buyerId,
                    title: 'Gift Card Order Cancelled',
                    body: cancelledBy === order.buyerId
                        ? 'You have cancelled your gift card order. Funds have been refunded.'
                        : 'The gift card order has been cancelled by the seller. Your funds have been refunded.',
                    data: { orderId: order.id, type: 'GIFT_CARD_ORDER_CANCELLED' },
                },
                {
                    userId: otherPartyId,
                    title: 'Gift Card Order Cancelled',
                    body: `The gift card order has been cancelled by ${cancelledBy === order.buyerId ? 'the buyer' : 'the seller'}.`,
                    data: { orderId: order.id, type: 'GIFT_CARD_ORDER_CANCELLED' },
                },
            ],
        });
        await this.prisma.securityLog.create({
            data: {
                userId: cancelledBy,
                action: 'GIFT_CARD_ORDER_CANCELLED',
                metadata: { orderId: order.id },
            },
        });
    }
};
exports.GiftCardEventsHandler = GiftCardEventsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.listing.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleListingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.listing.approved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleListingApproved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.listing.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleListingRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.order.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.order.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleOrderCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('gift_card.order.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftCardEventsHandler.prototype, "handleOrderCancelled", null);
exports.GiftCardEventsHandler = GiftCardEventsHandler = GiftCardEventsHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GiftCardEventsHandler);
//# sourceMappingURL=gift-card.events.handler.js.map