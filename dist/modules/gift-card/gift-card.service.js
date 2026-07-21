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
var GiftCardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const encryption_1 = require("../../core/utils/encryption");
const ledger_service_1 = require("../wallet/ledger.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("../../generated/client/index.js");
const uuid_1 = require("uuid");
let GiftCardService = GiftCardService_1 = class GiftCardService {
    prisma;
    encryption;
    ledgerService;
    eventEmitter;
    logger = new common_1.Logger(GiftCardService_1.name);
    constructor(prisma, encryption, ledgerService, eventEmitter) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.ledgerService = ledgerService;
        this.eventEmitter = eventEmitter;
    }
    async createListing(sellerId, dto) {
        const encryptedCode = this.encryption.encrypt(dto.cardCode);
        const encryptedPin = dto.cardPin ? this.encryption.encrypt(dto.cardPin) : null;
        const listing = await this.prisma.giftCardListing.create({
            data: {
                sellerId,
                brand: dto.brand,
                cardCode: encryptedCode,
                cardPin: encryptedPin,
                denomination: new client_1.Prisma.Decimal(dto.denomination),
                cardCurrency: dto.cardCurrency.toUpperCase(),
                exchangeRate: new client_1.Prisma.Decimal(dto.exchangeRate),
                askingPriceNgn: new client_1.Prisma.Decimal(dto.askingPriceNgn),
                status: 'PENDING_REVIEW',
                evidenceUrls: dto.evidenceUrls || [],
            },
            include: {
                seller: {
                    include: { profile: true },
                },
            },
        });
        this.eventEmitter.emit('gift_card.listing.created', listing);
        this.logger.log(`Listing created: ${listing.id} by ${sellerId}`);
        return this.stripSensitive(listing);
    }
    async getActiveListings(dto) {
        const where = {
            status: 'ACTIVE',
        };
        if (dto.brand) {
            where.brand = dto.brand;
        }
        if (dto.search) {
            where.OR = [
                { cardCurrency: { contains: dto.search, mode: 'insensitive' } },
            ];
        }
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [listings, total] = await Promise.all([
            this.prisma.giftCardListing.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    seller: {
                        include: { profile: true },
                    },
                },
            }),
            this.prisma.giftCardListing.count({ where }),
        ]);
        return {
            data: listings.map((l) => this.stripSensitive(l)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getListingById(listingId) {
        const listing = await this.prisma.giftCardListing.findUnique({
            where: { id: listingId },
            include: {
                seller: {
                    include: { profile: true },
                },
                evidenceRecords: true,
            },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Gift card listing not found');
        }
        return this.stripSensitive(listing);
    }
    async getMyListings(sellerId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [listings, total] = await Promise.all([
            this.prisma.giftCardListing.findMany({
                where: { sellerId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.giftCardListing.count({ where: { sellerId } }),
        ]);
        return {
            data: listings.map((l) => this.stripSensitive(l)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async purchaseListing(buyerId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const listing = await tx.$queryRaw `SELECT id, sellerId, status, "askingPriceNgn"::text, "cardCurrency", denomination::text, version
         FROM "GiftCardListing"
         WHERE id = ${dto.listingId}
         FOR UPDATE`;
            if (!listing.length) {
                throw new common_1.NotFoundException('Gift card listing not found');
            }
            const row = listing[0];
            if (row.status !== 'ACTIVE') {
                throw new common_1.ConflictException('This listing is no longer available');
            }
            if (row.sellerId === buyerId) {
                throw new common_1.BadRequestException('You cannot purchase your own listing');
            }
            const wallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: buyerId, currency: 'NGN' } },
            });
            if (!wallet) {
                throw new common_1.BadRequestException('NGN wallet not found. Please fund your wallet first.');
            }
            const priceNgn = new client_1.Prisma.Decimal(row.askingPriceNgn);
            const currentBalance = new client_1.Prisma.Decimal(wallet.balance);
            if (currentBalance.lessThan(priceNgn)) {
                throw new common_1.ConflictException(`Insufficient balance. Required ₦${priceNgn.toFixed(2)}, available ₦${currentBalance.toFixed(2)}`);
            }
            const debitRef = `GC-PURCHASE-${(0, uuid_1.v4)()}`;
            await this.ledgerService.createEntry(tx, {
                walletId: wallet.id,
                amount: -priceNgn.toNumber(),
                type: 'GIFT_CARD_PURCHASE',
                reference: debitRef,
                metadata: { listingId: dto.listingId, sellerId: row.sellerId },
            });
            const order = await tx.giftCardOrder.create({
                data: {
                    listingId: dto.listingId,
                    buyerId,
                    sellerId: row.sellerId,
                    status: 'PENDING_DELIVERY',
                    denomination: new client_1.Prisma.Decimal(row.denomination),
                    cardCurrency: row.cardCurrency,
                    askingPriceNgn: priceNgn,
                    feeAmount: new client_1.Prisma.Decimal(0),
                    totalPaidNgn: priceNgn,
                },
            });
            await tx.giftCardListing.update({
                where: { id: dto.listingId },
                data: { status: 'SOLD', version: { increment: 1 } },
            });
            this.eventEmitter.emit('gift_card.order.created', {
                order,
                listingId: dto.listingId,
                buyerId,
                sellerId: row.sellerId,
            });
            this.logger.log(`Gift card purchased: order ${order.id}, listing ${dto.listingId}, buyer ${buyerId}`);
            return order;
        });
    }
    async getMyPurchases(buyerId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.prisma.giftCardOrder.findMany({
                where: { buyerId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    listing: true,
                    seller: { include: { profile: true } },
                },
            }),
            this.prisma.giftCardOrder.count({ where: { buyerId } }),
        ]);
        return {
            data: orders.map((o) => this.formatOrderForBuyer(o)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getMySales(sellerId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.prisma.giftCardOrder.findMany({
                where: { sellerId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    listing: true,
                    buyer: { include: { profile: true } },
                },
            }),
            this.prisma.giftCardOrder.count({ where: { sellerId } }),
        ]);
        return {
            data: orders.map((o) => this.formatOrderForSeller(o)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async confirmReceipt(buyerId, orderId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.giftCardOrder.findUnique({
                where: { id: orderId },
                include: { listing: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.buyerId !== buyerId) {
                throw new common_1.ForbiddenException('You can only confirm your own orders');
            }
            if (order.status !== 'PENDING_DELIVERY') {
                throw new common_1.ConflictException(`Order cannot be confirmed in "${order.status}" status`);
            }
            const updatedOrder = await tx.giftCardOrder.update({
                where: { id: orderId },
                data: {
                    status: 'COMPLETED',
                    version: { increment: 1 },
                },
                include: {
                    listing: true,
                    seller: { include: { profile: true } },
                },
            });
            const cardCode = this.encryption.decrypt(order.listing.cardCode);
            const cardPin = order.listing.cardPin
                ? this.encryption.decrypt(order.listing.cardPin)
                : null;
            this.eventEmitter.emit('gift_card.order.completed', {
                order: updatedOrder,
                buyerId,
                sellerId: order.sellerId,
            });
            this.logger.log(`Gift card order confirmed: ${orderId} by buyer ${buyerId}`);
            return {
                ...this.formatOrderForBuyer(updatedOrder),
                cardCode,
                cardPin,
            };
        });
    }
    async cancelOrder(userId, orderId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.giftCardOrder.findUnique({
                where: { id: orderId },
                include: { listing: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.buyerId !== userId && order.sellerId !== userId) {
                throw new common_1.ForbiddenException('You are not part of this order');
            }
            if (!['CREATED', 'PENDING_DELIVERY'].includes(order.status)) {
                throw new common_1.ConflictException(`Order cannot be cancelled in "${order.status}" status`);
            }
            const wallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: 'NGN' } },
            });
            if (wallet) {
                const refundRef = `GC-REFUND-${(0, uuid_1.v4)()}`;
                await this.ledgerService.createEntry(tx, {
                    walletId: wallet.id,
                    amount: order.totalPaidNgn.toNumber(),
                    type: 'GIFT_CARD_SALE',
                    reference: refundRef,
                    metadata: { orderId, reason: 'order_cancelled' },
                });
            }
            await tx.giftCardOrder.update({
                where: { id: orderId },
                data: { status: 'CANCELLED', version: { increment: 1 } },
            });
            await tx.giftCardListing.update({
                where: { id: order.listingId },
                data: { status: 'ACTIVE', version: { increment: 1 } },
            });
            this.eventEmitter.emit('gift_card.order.cancelled', {
                order,
                cancelledBy: userId,
            });
            this.logger.log(`Gift card order cancelled: ${orderId} by ${userId}`);
            return { success: true, message: 'Order cancelled and funds refunded' };
        });
    }
    async deleteListing(sellerId, listingId) {
        const listing = await this.prisma.giftCardListing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.sellerId !== sellerId) {
            throw new common_1.ForbiddenException('You can only delete your own listings');
        }
        if (listing.status !== 'PENDING_REVIEW') {
            throw new common_1.ConflictException('Only pending review listings can be deleted');
        }
        await this.prisma.giftCardListing.delete({ where: { id: listingId } });
        return { success: true };
    }
    async getListingAdmin(listingId) {
        const listing = await this.prisma.giftCardListing.findUnique({
            where: { id: listingId },
            include: {
                seller: { include: { profile: true } },
                moderator: { include: { profile: true } },
                evidenceRecords: true,
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        buyer: { include: { profile: true } },
                    },
                },
            },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        return {
            ...listing,
            cardCode: this.encryption.decrypt(listing.cardCode),
            cardPin: listing.cardPin ? this.encryption.decrypt(listing.cardPin) : null,
        };
    }
    async getAllListingsAdmin(dto) {
        const where = {};
        if (dto.brand)
            where.brand = dto.brand;
        if (dto.status)
            where.status = dto.status;
        if (dto.search) {
            where.OR = [
                { cardCurrency: { contains: dto.search, mode: 'insensitive' } },
                { seller: { email: { contains: dto.search, mode: 'insensitive' } } },
            ];
        }
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [listings, total] = await Promise.all([
            this.prisma.giftCardListing.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    seller: { include: { profile: true } },
                    moderator: { include: { profile: true } },
                },
            }),
            this.prisma.giftCardListing.count({ where }),
        ]);
        return {
            data: listings.map((l) => this.stripSensitive(l)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async moderateListing(listingId, dto, moderatorId) {
        const listing = await this.prisma.giftCardListing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found');
        }
        if (listing.status !== 'PENDING_REVIEW') {
            throw new common_1.ConflictException('Only pending review listings can be moderated');
        }
        const updated = await this.prisma.giftCardListing.update({
            where: { id: listingId },
            data: {
                status: dto.status,
                moderatorId,
                moderatorNote: dto.moderatorNote,
                version: { increment: 1 },
            },
            include: {
                seller: { include: { profile: true } },
            },
        });
        const eventType = dto.status === 'ACTIVE' ? 'gift_card.listing.approved' : 'gift_card.listing.rejected';
        this.eventEmitter.emit(eventType, { listing: updated, moderatorId });
        this.logger.log(`Listing ${listingId} moderated to ${dto.status} by ${moderatorId}`);
        return updated;
    }
    async getAllOrdersAdmin(dto) {
        const where = {};
        if (dto.status)
            where.status = dto.status;
        if (dto.search) {
            where.OR = [
                { buyer: { email: { contains: dto.search, mode: 'insensitive' } } },
                { seller: { email: { contains: dto.search, mode: 'insensitive' } } },
            ];
        }
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            this.prisma.giftCardOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    listing: true,
                    buyer: { include: { profile: true } },
                    seller: { include: { profile: true } },
                },
            }),
            this.prisma.giftCardOrder.count({ where }),
        ]);
        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getOrderDetailAdmin(orderId) {
        const order = await this.prisma.giftCardOrder.findUnique({
            where: { id: orderId },
            include: {
                listing: true,
                buyer: { include: { profile: true } },
                seller: { include: { profile: true } },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return {
            ...order,
            listing: {
                ...order.listing,
                cardCode: this.encryption.decrypt(order.listing.cardCode),
                cardPin: order.listing.cardPin
                    ? this.encryption.decrypt(order.listing.cardPin)
                    : null,
            },
        };
    }
    async getStats() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalListings, pendingReview, activeListings, totalOrders, completedOrders, volumeResult] = await Promise.all([
            this.prisma.giftCardListing.count(),
            this.prisma.giftCardListing.count({ where: { status: 'PENDING_REVIEW' } }),
            this.prisma.giftCardListing.count({ where: { status: 'ACTIVE' } }),
            this.prisma.giftCardOrder.count(),
            this.prisma.giftCardOrder.count({ where: { status: 'COMPLETED' } }),
            this.prisma.giftCardOrder.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
                _sum: { totalPaidNgn: true },
            }),
        ]);
        return {
            totalListings,
            pendingReview,
            activeListings,
            totalOrders,
            completedOrders,
            totalVolumeNgn: volumeResult._sum.totalPaidNgn || 0,
        };
    }
    stripSensitive(listing) {
        const { cardCode, cardPin, ...safe } = listing;
        return safe;
    }
    formatOrderForBuyer(order) {
        const { listing, ...rest } = order;
        return {
            ...rest,
            brand: listing?.brand,
            cardCurrency: listing?.cardCurrency,
            denomination: listing?.denomination,
            cardCode: order.status === 'COMPLETED' && listing
                ? this.encryption.decrypt(listing.cardCode)
                : null,
            cardPin: order.status === 'COMPLETED' && listing?.cardPin
                ? this.encryption.decrypt(listing.cardPin)
                : null,
        };
    }
    formatOrderForSeller(order) {
        const { listing, ...rest } = order;
        return {
            ...rest,
            brand: listing?.brand,
            cardCurrency: listing?.cardCurrency,
            denomination: listing?.denomination,
        };
    }
};
exports.GiftCardService = GiftCardService;
exports.GiftCardService = GiftCardService = GiftCardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_1.EncryptionService,
        ledger_service_1.LedgerService,
        event_emitter_1.EventEmitter2])
], GiftCardService);
//# sourceMappingURL=gift-card.service.js.map