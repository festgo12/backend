import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { OrderStatus, Currency, LedgerType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  async createOrder(buyerId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get and Validate Ad
      const ad = await tx.ad.findUnique({
        where: { id: dto.adId },
        include: { seller: true },
      });

      if (!ad || ad.status !== 'ACTIVE') {
        throw new NotFoundException('Advertisement not found or inactive');
      }

      if (ad.sellerId === buyerId) {
        throw new BadRequestException('You cannot trade with your own advertisement');
      }

      // 2. Calculate Amounts
      let fiatAmount: Decimal;
      let cryptoAmount: Decimal;

      const adPrice = new Decimal(ad.price.toString());

      if (dto.fiatAmount) {
        fiatAmount = new Decimal(dto.fiatAmount);
        cryptoAmount = fiatAmount.dividedBy(adPrice).toDecimalPlaces(8);
      } else if (dto.cryptoAmount) {
        cryptoAmount = new Decimal(dto.cryptoAmount);
        fiatAmount = cryptoAmount.times(adPrice).toDecimalPlaces(2);
      } else {
        throw new BadRequestException('Either fiatAmount or cryptoAmount must be provided');
      }

      // 3. Validate Limits
      const minLimit = new Decimal(ad.minLimit.toString());
      const maxLimit = new Decimal(ad.maxLimit.toString());
      const adQuantity = new Decimal(ad.quantity.toString());

      if (fiatAmount.lessThan(minLimit) || fiatAmount.greaterThan(maxLimit)) {
        throw new BadRequestException(`Amount must be between ₦${minLimit} and ₦${maxLimit}`);
      }

      if (cryptoAmount.greaterThan(adQuantity)) {
        throw new BadRequestException('Requested quantity exceeds advertisement available volume');
      }

      // 4. Validate and Reserve Balances
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: buyerId, currency: Currency.NGN } },
      });

      if (!buyerFiatWallet || new Decimal(buyerFiatWallet.balance.toString()).lessThan(fiatAmount)) {
        throw new BadRequestException('Insufficient fiat balance to initiate this trade');
      }

      const sellerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: ad.sellerId, currency: ad.asset } },
      });

      if (!sellerCryptoWallet || new Decimal(sellerCryptoWallet.balance.toString()).lessThan(cryptoAmount)) {
        throw new BadRequestException('Seller does not have enough crypto to fulfill this order');
      }

      // 5. Reserve Buyer Fiat (Optimistic Lock)
      const reserveResult = await tx.wallet.updateMany({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { decrement: fiatAmount },
          reservedBalance: { increment: fiatAmount },
          version: { increment: 1 },
        },
      });

      if (reserveResult.count === 0) {
        throw new InternalServerErrorException('Conflict during balance reservation. Please retry.');
      }

      // 6. Create Order
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const order = await tx.order.create({
        data: {
          adId: ad.id,
          buyerId,
          sellerId: ad.sellerId,
          status: OrderStatus.PENDING_SELLER,
          fiatAmount,
          cryptoAmount,
          feeAmount: 0,
          expiresAt,
        },
      });

      // 7. Emit Event
      this.eventEmitter.emit('order.created', order);

      return order;
    });
  }

  async approveOrder(orderId: string, sellerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ad: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.sellerId !== sellerId) throw new BadRequestException('Unauthorized');
      if (order.status !== OrderStatus.PENDING_SELLER) {
        throw new BadRequestException(`Cannot approve order in ${order.status} state`);
      }

      const cryptoAmount = new Decimal(order.cryptoAmount.toString());
      const fiatAmount = new Decimal(order.fiatAmount.toString());

      // Calculate Fees (0.5% per side)
      const buyerFee = cryptoAmount.times(0.005).toDecimalPlaces(8);
      const sellerFee = fiatAmount.times(0.005).toDecimalPlaces(2);

      // 1. Deduct Crypto from Seller (Optimistic Lock)
      const sellerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: sellerId, currency: order.ad.asset } },
      });
      if (!sellerCryptoWallet) throw new InternalServerErrorException('Seller wallet not found');

      const deductCryptoResult = await tx.wallet.updateMany({
        where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
        data: {
          balance: { decrement: cryptoAmount },
          version: { increment: 1 },
        },
      });
      if (deductCryptoResult.count === 0) throw new InternalServerErrorException('Conflict updating seller crypto wallet');

      // 2. Transfer Fiat from Buyer Reserved to Seller Available (Optimistic Lock)
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: order.buyerId, currency: Currency.NGN } },
      });
      if (!buyerFiatWallet) throw new InternalServerErrorException('Buyer fiat wallet not found');

      const releaseReservedResult = await tx.wallet.updateMany({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          reservedBalance: { decrement: fiatAmount },
          version: { increment: 1 },
        },
      });
      if (releaseReservedResult.count === 0) throw new InternalServerErrorException('Conflict releasing buyer reserved funds');

      const sellerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: sellerId, currency: Currency.NGN } },
      });
      if (!sellerFiatWallet) throw new InternalServerErrorException('Seller fiat wallet not found');

      const creditSellerFiatResult = await tx.wallet.updateMany({
        where: { id: sellerFiatWallet.id, version: sellerFiatWallet.version },
        data: {
          balance: { increment: fiatAmount.minus(sellerFee) },
          version: { increment: 1 },
        },
      });
      if (creditSellerFiatResult.count === 0) throw new InternalServerErrorException('Conflict crediting seller fiat wallet');

      // 3. Credit Crypto to Buyer (Optimistic Lock)
      const buyerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: order.buyerId, currency: order.ad.asset } },
      });
      if (!buyerCryptoWallet) throw new InternalServerErrorException('Buyer crypto wallet not found');

      const creditBuyerCryptoResult = await tx.wallet.updateMany({
        where: { id: buyerCryptoWallet.id, version: buyerCryptoWallet.version },
        data: {
          balance: { increment: cryptoAmount.minus(buyerFee) },
          version: { increment: 1 },
        },
      });
      if (creditBuyerCryptoResult.count === 0) throw new InternalServerErrorException('Conflict crediting buyer crypto wallet');

      // 4. Update Ad Quantity (Optimistic Lock)
      const ad = await tx.ad.findUnique({ where: { id: order.adId } });
      if (!ad) throw new InternalServerErrorException('Ad not found during settlement');
      
      const newAdQuantity = new Decimal(ad.quantity.toString()).minus(cryptoAmount);
      const updateAdResult = await tx.ad.updateMany({
        where: { id: ad.id, version: ad.version },
        data: {
          quantity: newAdQuantity,
          version: { increment: 1 },
          status: newAdQuantity.lte(0) ? 'COMPLETED' : 'ACTIVE',
        },
      });
      if (updateAdResult.count === 0) throw new InternalServerErrorException('Conflict updating ad quantity');

      // 5. Create Ledger Entries
      await tx.ledgerEntry.createMany({
        data: [
          {
            walletId: buyerFiatWallet.id,
            orderId: order.id,
            amount: fiatAmount.negated(),
            type: LedgerType.TRADE_SETTLEMENT,
            reference: `SETTLE-NGN-BUYER-${order.id}`,
            balanceAfter: new Decimal(buyerFiatWallet.balance.toString()),
          },
          {
            walletId: sellerFiatWallet.id,
            orderId: order.id,
            amount: fiatAmount.minus(sellerFee),
            type: LedgerType.TRADE_SETTLEMENT,
            reference: `SETTLE-NGN-SELLER-${order.id}`,
            balanceAfter: new Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount.minus(sellerFee)),
          },
          {
            walletId: buyerCryptoWallet.id,
            orderId: order.id,
            amount: cryptoAmount.minus(buyerFee),
            type: LedgerType.TRADE_SETTLEMENT,
            reference: `SETTLE-CRYPTO-BUYER-${order.id}`,
            balanceAfter: new Decimal(buyerCryptoWallet.balance.toString()).plus(cryptoAmount.minus(buyerFee)),
          },
          {
            walletId: sellerCryptoWallet.id,
            orderId: order.id,
            amount: cryptoAmount.negated(),
            type: LedgerType.TRADE_SETTLEMENT,
            reference: `SETTLE-CRYPTO-SELLER-${order.id}`,
            balanceAfter: new Decimal(sellerCryptoWallet.balance.toString()).minus(cryptoAmount),
          },
        ],
      });

      // 6. Complete Order
      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          feeAmount: buyerFee.plus(sellerFee),
          version: { increment: 1 },
        },
      });

      // 7. Emit Event
      this.eventEmitter.emit('order.completed', finalOrder);

      return finalOrder;
    });
  }

  async declineOrder(orderId: string, initiatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING_SELLER) {
        throw new BadRequestException(`Cannot decline/cancel order in ${order.status} state`);
      }

      const fiatAmount = new Decimal(order.fiatAmount.toString());

      // Refund Buyer Reserved Fiat (Optimistic Lock)
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: order.buyerId, currency: Currency.NGN } },
      });
      if (!buyerFiatWallet) throw new InternalServerErrorException('Buyer fiat wallet not found');

      const refundResult = await tx.wallet.updateMany({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { increment: fiatAmount },
          reservedBalance: { decrement: fiatAmount },
          version: { increment: 1 },
        },
      });

      if (refundResult.count === 0) throw new InternalServerErrorException('Conflict during refund. Please retry.');

      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: { 
          status: OrderStatus.DECLINED,
          version: { increment: 1 },
        },
      });

      this.eventEmitter.emit('order.declined', { order: finalOrder, initiatorId });
      return finalOrder;
    });
  }

  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ad: true, buyer: true, seller: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    return order;
  }

  async listUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: { ad: true },
    });
  }
}
