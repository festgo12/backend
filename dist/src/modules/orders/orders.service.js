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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
const event_emitter_1 = require("@nestjs/event-emitter");
const library_1 = require("../../generated/client/runtime/library");
const platform_service_1 = require("../crypto/platform.service");
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    eventEmitter;
    platformService;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(prisma, eventEmitter, platformService) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.platformService = platformService;
    }
    async getFeePercent(key) {
        const config = await this.prisma.platformFeeConfig.findUnique({ where: { key } });
        return config ? Number(config.value) : 0.5;
    }
    resolveRoles(adType, buyerId, sellerId) {
        const isSellAd = adType === client_1.AdType.SELL;
        return {
            isSellAd,
            cryptoSellerId: isSellAd ? sellerId : buyerId,
            cryptoBuyerId: isSellAd ? buyerId : sellerId,
            fiatPayerId: isSellAd ? buyerId : sellerId,
            fiatReceiverId: isSellAd ? sellerId : buyerId,
        };
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
            const isSellAd = ad.type === client_1.AdType.SELL;
            const fiatPayerId = isSellAd ? buyerId : ad.sellerId;
            const cryptoSellerId = isSellAd ? ad.sellerId : buyerId;
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
                where: { userId_currency: { userId: fiatPayerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet || new library_1.Decimal(buyerFiatWallet.balance.toString()).lessThan(fiatAmount)) {
                throw new common_1.BadRequestException('Insufficient fiat balance to initiate this trade');
            }
            const sellerCryptoWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: cryptoSellerId, currency: ad.asset } },
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
            await tx.ledgerEntry.create({
                data: {
                    walletId: buyerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount.negated(),
                    type: client_1.LedgerType.TRADE_RESERVE,
                    reference: `RESERVE-NGN-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()).minus(fiatAmount),
                    metadata: { action: 'reserve', currency: 'NGN' },
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
        const order = await this.prisma.order.findUnique({
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
        const isSellAd = order.ad.type === client_1.AdType.SELL;
        const cryptoAmount = new library_1.Decimal(order.cryptoAmount.toString());
        const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
        const buyFeePercent = await this.getFeePercent('trade_buy_fee_percent');
        const sellFeePercent = await this.getFeePercent('trade_sell_fee_percent');
        const buyerFee = cryptoAmount.times(buyFeePercent / 100).toDecimalPlaces(8);
        const sellerFee = fiatAmount.times(sellFeePercent / 100).toDecimalPlaces(2);
        const cryptoSellerId = isSellAd ? order.sellerId : order.buyerId;
        const cryptoBuyerId = isSellAd ? order.buyerId : order.sellerId;
        const fiatPayerId = cryptoBuyerId;
        const fiatReceiverId = cryptoSellerId;
        const feeWallet = await this.platformService.getPlatformFeeWallet(order.ad.asset);
        const settlement = await this.prisma.$transaction(async (tx) => {
            const approvedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.APPROVED,
                    version: { increment: 1 },
                },
            });
            const sellerCryptoWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: cryptoSellerId, currency: order.ad.asset } },
            });
            if (!sellerCryptoWallet)
                throw new common_1.InternalServerErrorException('Crypto seller wallet not found');
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
                where: { userId_currency: { userId: cryptoBuyerId, currency: order.ad.asset } },
            });
            if (!buyerCryptoWallet)
                throw new common_1.InternalServerErrorException('Crypto buyer wallet not found');
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
                where: { userId_currency: { userId: fiatPayerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Fiat payer wallet not found');
            const releaseReservedFiatResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (releaseReservedFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict releasing fiat reserve');
            const sellerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: fiatReceiverId, currency: client_1.Currency.NGN } },
            });
            if (!sellerFiatWallet)
                throw new common_1.InternalServerErrorException('Fiat receiver wallet not found');
            const creditSellerFiatResult = await tx.wallet.updateMany({
                where: { id: sellerFiatWallet.id, version: sellerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount.minus(sellerFee) },
                    version: { increment: 1 },
                },
            });
            if (creditSellerFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict crediting fiat receiver');
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
            const ledgerData = [
                {
                    walletId: buyerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount.negated(),
                    type: client_1.LedgerType.TRADE_SETTLEMENT,
                    reference: `SETTLE-NGN-PAYER-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()),
                },
                {
                    walletId: sellerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount,
                    type: client_1.LedgerType.TRADE_SETTLEMENT,
                    reference: `SETTLE-NGN-RECEIVER-${order.id}`,
                    balanceAfter: new library_1.Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount),
                },
                {
                    walletId: sellerFiatWallet.id,
                    orderId: order.id,
                    amount: sellerFee.negated(),
                    type: client_1.LedgerType.FEE,
                    reference: `FEE-NGN-RECEIVER-${order.id}`,
                    balanceAfter: new library_1.Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount.minus(sellerFee)),
                },
                {
                    walletId: buyerCryptoWallet.id,
                    orderId: order.id,
                    amount: cryptoAmount,
                    type: client_1.LedgerType.TRADE_SETTLEMENT,
                    reference: `SETTLE-CRYPTO-BUYER-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerCryptoWallet.balance.toString()).plus(cryptoAmount),
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
            ];
            if (feeWallet) {
                const feeWalletRow = await tx.wallet.findUnique({ where: { id: feeWallet.id } });
                if (feeWalletRow) {
                    ledgerData.push({
                        walletId: feeWallet.id,
                        orderId: order.id,
                        amount: buyerFee,
                        type: client_1.LedgerType.FEE,
                        reference: `FEE-CRYPTO-PLATFORM-${order.id}`,
                        balanceAfter: new library_1.Decimal(feeWalletRow.balance.toString()).plus(buyerFee).plus(sellerFee),
                    });
                    ledgerData.push({
                        walletId: feeWallet.id,
                        orderId: order.id,
                        amount: sellerFee,
                        type: client_1.LedgerType.FEE,
                        reference: `FEE-NGN-PLATFORM-${order.id}`,
                        balanceAfter: new library_1.Decimal(feeWalletRow.balance.toString()).plus(buyerFee).plus(sellerFee),
                    });
                }
            }
            await tx.ledgerEntry.createMany({ data: ledgerData });
            const finalOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.COMPLETED,
                    feeAmount: buyerFee.plus(sellerFee),
                    version: approvedOrder.version + 1,
                },
            });
            this.eventEmitter.emit('order.completed', finalOrder);
            return { finalOrder, sellerCryptoWallet, buyerCryptoWallet };
        });
        return settlement.finalOrder;
    }
    async declineOrder(orderId, initiatorId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.PENDING_SELLER && order.status !== client_1.OrderStatus.CREATED) {
                throw new common_1.BadRequestException(`Cannot decline/cancel order in ${order.status} state`);
            }
            if (order.buyerId !== initiatorId && order.sellerId !== initiatorId) {
                throw new common_1.BadRequestException('Only a party to this order may decline it');
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const { fiatPayerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: fiatPayerId, currency: client_1.Currency.NGN } },
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
            await tx.ledgerEntry.create({
                data: {
                    walletId: buyerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount,
                    type: client_1.LedgerType.TRADE_REFUND,
                    reference: `REFUND-NGN-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()).plus(fiatAmount),
                    metadata: { action: 'refund', reason: 'declined' },
                },
            });
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
                include: { ad: true },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.PENDING_SELLER && order.status !== client_1.OrderStatus.CREATED) {
                throw new common_1.BadRequestException(`Cannot expire order in ${order.status} state`);
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const { fiatPayerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: fiatPayerId, currency: client_1.Currency.NGN } },
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
            await tx.ledgerEntry.create({
                data: {
                    walletId: buyerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount,
                    type: client_1.LedgerType.TRADE_REFUND,
                    reference: `REFUND-NGN-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()).plus(fiatAmount),
                    metadata: { action: 'refund', reason: 'expired' },
                },
            });
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
            const isParty = order.buyerId === initiatorId || order.sellerId === initiatorId;
            const isAdmin = (await tx.user.findUnique({ where: { id: initiatorId }, select: { role: true } }))?.role === 'ADMIN';
            if (!isParty && !isAdmin) {
                throw new common_1.BadRequestException('Only a party to this order or an admin may flag it');
            }
            if (order.status === client_1.OrderStatus.COMPLETED ||
                order.status === client_1.OrderStatus.DECLINED ||
                order.status === client_1.OrderStatus.EXPIRED ||
                order.status === client_1.OrderStatus.CANCELLED) {
                throw new common_1.BadRequestException(`Cannot flag order in ${order.status} state`);
            }
            const fiatAmount = new library_1.Decimal(order.fiatAmount.toString());
            const { fiatPayerId, cryptoSellerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);
            const buyerFiatWallet = await tx.wallet.findUnique({
                where: { userId_currency: { userId: fiatPayerId, currency: client_1.Currency.NGN } },
            });
            if (!buyerFiatWallet)
                throw new common_1.InternalServerErrorException('Fiat payer wallet not found');
            const refundFiatResult = await tx.wallet.updateMany({
                where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
                data: {
                    balance: { increment: fiatAmount },
                    reservedBalance: { decrement: fiatAmount },
                    version: { increment: 1 },
                },
            });
            if (refundFiatResult.count === 0)
                throw new common_1.InternalServerErrorException('Conflict refunding fiat payer');
            await tx.ledgerEntry.create({
                data: {
                    walletId: buyerFiatWallet.id,
                    orderId: order.id,
                    amount: fiatAmount,
                    type: client_1.LedgerType.TRADE_REFUND,
                    reference: `REFUND-NGN-FRAUD-${order.id}`,
                    balanceAfter: new library_1.Decimal(buyerFiatWallet.balance.toString()).plus(fiatAmount),
                    metadata: { action: 'refund', reason: 'fraud_flagged' },
                },
            });
            if (order.status === client_1.OrderStatus.APPROVED) {
                const cryptoAmount = new library_1.Decimal(order.cryptoAmount.toString());
                const sellerCryptoWallet = await tx.wallet.findUnique({
                    where: { userId_currency: { userId: cryptoSellerId, currency: order.ad.asset } },
                });
                if (!sellerCryptoWallet)
                    throw new common_1.InternalServerErrorException('Crypto seller wallet not found');
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
                await tx.ledgerEntry.create({
                    data: {
                        walletId: sellerCryptoWallet.id,
                        orderId: order.id,
                        amount: cryptoAmount,
                        type: client_1.LedgerType.TRADE_REFUND,
                        reference: `REFUND-CRYPTO-FRAUD-${order.id}`,
                        balanceAfter: new library_1.Decimal(sellerCryptoWallet.balance.toString()).plus(cryptoAmount),
                        metadata: { action: 'refund', reason: 'fraud_flagged' },
                    },
                });
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
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        platform_service_1.PlatformService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map