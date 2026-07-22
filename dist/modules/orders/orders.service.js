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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
const event_emitter_1 = require("@nestjs/event-emitter");
const library_1 = require("../../generated/client/runtime/library");
let OrdersService = class OrdersService {
    prisma;
    eventEmitter;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async getFeePercent(key) {
        const config = await this.prisma.platformFeeConfig.findUnique({ where: { key } });
        return config ? Number(config.value) : 0.5;
    }
    async createOrder(buyerId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const ad = await tx.ad.findUnique({
                where: { id: dto.adId },
                include: { seller: true },
            });
            if (!ad || ad.status !== 'ACTIVE') {
                throw new common_1.NotFoundException('Advertisement not found or inactive');
            }
            if (ad.sellerId === buyerId) {
                throw new common_1.BadRequestException('You cannot trade with your own advertisement');
            }
            let fiatAmount;
            let cryptoAmount;
            const adPrice = new library_1.Decimal(ad.price.toString());
            if (dto.fiatAmount) {
                fiatAmount = new library_1.Decimal(dto.fiatAmount);
                cryptoAmount = fiatAmount.dividedBy(adPrice).toDecimalPlaces(8);
            }
            else if (dto.cryptoAmount) {
                cryptoAmount = new library_1.Decimal(dto.cryptoAmount);
                fiatAmount = cryptoAmount.times(adPrice).toDecimalPlaces(2);
            }
            else {
                throw new common_1.BadRequestException('Either fiatAmount or cryptoAmount must be provided');
            }
            const minLimit = new library_1.Decimal(ad.minLimit.toString());
            const maxLimit = new library_1.Decimal(ad.maxLimit.toString());
            const adQuantity = new library_1.Decimal(ad.quantity.toString());
            if (fiatAmount.lessThan(minLimit) || fiatAmount.greaterThan(maxLimit)) {
                throw new common_1.BadRequestException(`Amount must be between ₦${minLimit} and ₦${maxLimit}`);
            }
            if (cryptoAmount.greaterThan(adQuantity)) {
                throw new common_1.BadRequestException('Requested quantity exceeds advertisement available volume');
            }
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: buyerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet || new library_1.Decimal(buyerFiatWallet.balance.toString()).lessThan(fiatAmount)) {
                throw new common_1.BadRequestException('Insufficient fiat balance to initiate this trade');
            }
            const sellerCryptoWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: ad.sellerId, currency: ad.asset } },
            });
            if (!sellerCryptoWallet || new library_1.Decimal(sellerCryptoWallet.balance.toString()).lessThan(cryptoAmount)) {
                throw new common_1.BadRequestException('Seller does not have enough crypto to fulfill this order');
            }
            const reserveResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    balance: { decrement: fiatAmount },
                    reservedBalance: { increment: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (reserveResult.count === 0) {
                throw new common_1.InternalServerErrorException('Conflict during balance reservation. Please retry.');
            }
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            const order = await tx.order.create({
                data: {
                    adId: ad.id,
                    buyerId,
                    sellerId: ad.sellerId,
                    status: client_1.OrderStatus.CREATED,
                    fiatAmount,
                    cryptoAmount,
                    feeAmount: 0,
                    expiresAt,
                },
            });
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.PENDING_SELLER,
                    version: { increment: 1 },
                },
            });
            this.eventEmitter.emit('order.created', finalOrder);
            return finalOrder;
        });
    }
    async approveOrder(orderId, sellerId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.sellerId !== sellerId)
                throw new common_1.BadRequestException('Unauthorized');
            if (order.status !== client_1.OrderStatus.PENDING_SELLER) {
                throw new common_1.BadRequestException(`Cannot approve order in ${order.status} state`);
            }
            const cryptoAmount = new library_1.Decimal(order.cryptoAmount.toString());
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const buyFeePercent = await this.getFeePercent('trade_buy_fee_percent');
            const sellFeePercent = await this.getFeePercent('trade_sell_fee_percent');
            const buyerFee = cryptoAmount.times(buyFeePercent / 100).toDecimalPlaces(8);
            const sellerFee = fiatAmount.times(sellFeePercent / 100).toDecimalPlaces(2);
            const approvedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.APPROVED,
                    version: { increment: 1 },
                },
            });
            const sellerCryptoWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: sellerId, currency: order.ad.asset } },
            });
            if (!sellerCryptoWallet)
                throw new common_1.InternalServerErrorException('Seller crypto wallet not found');
            if (new library_1.Decimal(sellerCryptoWallet.balance.toString()).lessThan(cryptoAmount)) {
                throw new common_1.BadRequestException('Seller has insufficient crypto balance to lock');
            }
            const lockCryptoResult = await tx.wallet.updateMany({
                where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
                data: {
                    balance: { decrement: cryptoAmount },
                    reservedBalance: { increment: cryptoAmount },
                    version: { increment: 1 },
                },
            });
            if (lockCryptoResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict locking seller crypto');
            const transferCryptoResult = await tx.wallet.updateMany({
                where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version + 1 },
                data: {
                    reservedBalance: { decrement: cryptoAmount },
                    version: { increment: 1 },
                },
            });
            if (transferCryptoResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict transferring seller crypto');
            const buyerCryptoWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: order.ad.asset } },
            });
            if (!buyerCryptoWallet)
                throw new common_1.InternalServerErrorException('Buyer crypto wallet not found');
            const creditBuyerCryptoResult = await tx.wallet.updateMany({
                where: { id: buyerCryptoWallet.id, version: buyerCryptoWallet.version },
                data: {
                    balance: { increment: cryptoAmount.minus(buyerFee) },
                    version: { increment: 1 },
                },
            });
            if (creditBuyerCryptoResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict crediting buyer crypto');
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Buyer fiat wallet not found');
            const releaseReservedFiatResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (releaseReservedFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict releasing buyer reserved fiat');
            const sellerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: sellerId, currency: client_1.Currency.NGN } },
            });
            if (!sellerFiatWallet)
                throw new common_1.InternalServerErrorException('Seller fiat wallet not found');
            const creditSellerFiatResult = await tx.wallet.updateMany({
                where: { id: sellerFiatWallet.id, version: sellerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount.minus(sellerFee) },
                    version: { increment: 1 },
                },
            });
            if (creditSellerFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict crediting seller fiat');
            const ad = await tx.ad.findUnique({ where: { id: order.adId } });
            if (!ad)
                throw new common_1.InternalServerErrorException('Ad not found during settlement');
            const newAdQuantity = new library_1.Decimal(ad.quantity.toString()).minus(cryptoAmount);
            const updateAdResult = await tx.ad.updateMany({
                where: { id: ad.id, version: ad.version },
                data: {
                    quantity: newAdQuantity,
                    version: { increment: 1 },
                    status: newAdQuantity.lte(0) ? 'COMPLETED' : 'ACTIVE',
                },
            });
            if (updateAdResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict updating ad quantity');
            await tx.ledgerEntry.createMany({
                data: [
                    {
                        walletId: buyerFiatWallet.id,
                        orderId: order.id,
                        amount: fiatAmount.negated(),
                        type: client_1.LedgerType.TRADE_SETTLEMENT,
                        reference: `SETTLE-NGN-BUYER-${order.id}`,
                        balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()),
                    },
                    {
                        walletId: sellerFiatWallet.id,
                        orderId: order.id,
                        amount: fiatAmount.minus(sellerFee),
                        type: client_1.LedgerType.TRADE_SETTLEMENT,
                        reference: `SETTLE-NGN-SELLER-${order.id}`,
                        balanceAfter: new library_1.Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount.minus(sellerFee)),
                    },
                    {
                        walletId: sellerFiatWallet.id,
                        orderId: order.id,
                        amount: sellerFee.negated(),
                        type: client_1.LedgerType.FEE,
                        reference: `FEE-NGN-SELLER-${order.id}`,
                        balanceAfter: new library_1.Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount.minus(sellerFee)),
                    },
                    {
                        walletId: buyerCryptoWallet.id,
                        orderId: order.id,
                        amount: cryptoAmount.minus(buyerFee),
                        type: client_1.LedgerType.TRADE_SETTLEMENT,
                        reference: `SETTLE-CRYPTO-BUYER-${order.id}`,
                        balanceAfter: new library_1.Decimal(buyerCryptoWallet.balance.toString()).plus(cryptoAmount.minus(buyerFee)),
                    },
                    {
                        walletId: buyerCryptoWallet.id,
                        orderId: order.id,
                        amount: buyerFee.negated(),
                        type: client_1.LedgerType.FEE,
                        reference: `FEE-CRYPTO-BUYER-${order.id}`,
                        balanceAfter: new library_1.Decimal(buyerCryptoWallet.balance.toString()).plus(cryptoAmount.minus(buyerFee)),
                    },
                    {
                        walletId: sellerCryptoWallet.id,
                        orderId: order.id,
                        amount: cryptoAmount.negated(),
                        type: client_1.LedgerType.TRADE_SETTLEMENT,
                        reference: `SETTLE-CRYPTO-SELLER-${order.id}`,
                        balanceAfter: new library_1.Decimal(sellerCryptoWallet.balance.toString()).minus(cryptoAmount),
                    },
                ],
            });
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.COMPLETED,
                    feeAmount: buyerFee.plus(sellerFee),
                    version: approvedOrder.version + 1,
                },
            });
            this.eventEmitter.emit('order.completed', finalOrder);
            return finalOrder;
        });
    }
    async declineOrder(orderId, initiatorId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.PENDING_SELLER && order.status !== client_1.OrderStatus.CREATED) {
                throw new common_1.BadRequestException(`Cannot decline/cancel order in ${order.status} state`);
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Buyer fiat wallet not found');
            const refundResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount },
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (refundResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict during refund. Please retry.');
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.DECLINED,
                    version: { increment: 1 },
                },
            });
            this.eventEmitter.emit('order.declined', { order: finalOrder, initiatorId });
            return finalOrder;
        });
    }
    async expireOrder(orderId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.PENDING_SELLER && order.status !== client_1.OrderStatus.CREATED) {
                throw new common_1.BadRequestException(`Cannot expire order in ${order.status} state`);
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Buyer fiat wallet not found');
            const refundResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount },
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (refundResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict during refund. Please retry.');
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.EXPIRED,
                    version: { increment: 1 },
                },
            });
            this.eventEmitter.emit('order.expired', finalOrder);
            return finalOrder;
        });
    }
    async flagFraud(orderId, initiatorId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.fraudFlagged) {
                throw new common_1.BadRequestException('Order is already flagged as fraud');
            }
            if (order.status === client_1.OrderStatus.COMPLETED ||
                order.status === client_1.OrderStatus.DECLINED ||
                order.status === client_1.OrderStatus.EXPIRED ||
                order.status === client_1.OrderStatus.CANCELLED) {
                throw new common_1.BadRequestException(`Cannot flag order in ${order.status} state`);
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: order.buyerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Buyer fiat wallet not found');
            const refundFiatResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount },
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (refundFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict refunding buyer fiat');
            if (order.status === client_1.OrderStatus.APPROVED) {
                const cryptoAmount = new library_1.Decimal(order.cryptoAmount.toString());
                const sellerCryptoWallet = await tx.wallet.findUnique({
                    where: { userId_currency: { userId: order.sellerId, currency: order.ad.asset } },
                });
                if (!sellerCryptoWallet)
                    throw new common_1.InternalServerErrorException('Seller crypto wallet not found');
                const refundCryptoResult = await tx.wallet.updateMany({
                    where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
                    data: {
                        balance: { increment: cryptoAmount },
                        reservedBalance: { decrement: cryptoAmount },
                        version: { increment: 1 },
                    },
                });
                if (refundCryptoResult.count === 0)
                    throw new common_1.InternalServerErrorException('Conflict refunding seller crypto');
            }
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    fraudFlagged: true,
                    status: client_1.OrderStatus.CANCELLED,
                    version: { increment: 1 },
                },
            });
            this.eventEmitter.emit('order.fraud_flagged', { order: finalOrder, initiatorId });
            return finalOrder;
        });
    }
    async getOrder(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { ad: true, buyer: true, seller: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.buyerId !== userId && order.sellerId !== userId) {
            throw new common_1.BadRequestException('Unauthorized');
        }
        return order;
    }
    async listUserOrders(userId) {
        return this.prisma.order.findMany({
            where: {
                OR: [{ buyerId: userId }, { sellerId: userId }],
            },
            orderBy: { createdAt: 'desc' },
            include: { ad: true },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], OrdersService);
//# sourceMappingURL=orders.service.js.map