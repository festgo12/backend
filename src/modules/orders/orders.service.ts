import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { OrderStatus, Currency, LedgerType, AdType } from '@src/generated/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@src/generated/client/runtime/library';
import { PlatformService } from '../crypto/platform.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private platformService: PlatformService,
  ) {}

  private async getFeePercent(key: string): Promise<number> {
    const config = await this.prisma.platformFeeConfig.findUnique({ where: { key } });
    return config ? Number(config.value) : 0.5;
  }

  /**
   * Resolves trade roles from the ad direction. The crypto buyer always pays NGN:
   *   SELL ad: ad owner sells crypto, responder buys crypto with NGN
   *   BUY  ad: ad owner buys crypto with NGN, responder sells crypto
   */
  private resolveRoles(adType: AdType, buyerId: string, sellerId: string) {
    const isSellAd = adType === AdType.SELL;
    return {
      isSellAd,
      cryptoSellerId: isSellAd ? sellerId : buyerId,
      cryptoBuyerId: isSellAd ? buyerId : sellerId,
      fiatPayerId: isSellAd ? buyerId : sellerId,
      fiatReceiverId: isSellAd ? sellerId : buyerId,
    };
  }

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

      const isSellAd = ad.type === AdType.SELL;
      // The crypto buyer always pays NGN. For a SELL ad that is the responder
      // (buyerId); for a BUY ad the ad owner buys the crypto.
      const fiatPayerId = isSellAd ? buyerId : ad.sellerId;
      const cryptoSellerId = isSellAd ? ad.sellerId : buyerId;

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

      // 4. Validate Balances (Instant Insufficient Balance error)
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatPayerId, currency: Currency.NGN } },
      });

      if (!buyerFiatWallet || new Decimal(buyerFiatWallet.balance.toString()).lessThan(fiatAmount)) {
        throw new BadRequestException('Insufficient fiat balance to initiate this trade');
      }

      const sellerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: cryptoSellerId, currency: ad.asset } },
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

      // 6. Create Order initially in CREATED status
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const order = await tx.order.create({
        data: {
          adId: ad.id,
          buyerId,
          sellerId: ad.sellerId,
          status: OrderStatus.CREATED,
          fiatAmount,
          cryptoAmount,
          feeAmount: 0,
          expiresAt,
        },
      });

      // 7. Transition order status immediately to PENDING_SELLER and start countdown
      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PENDING_SELLER,
          version: { increment: 1 },
        },
      });

      // 8. Emit Event
      this.eventEmitter.emit('order.created', finalOrder);

      return finalOrder;
    });
  }

  async approveOrder(orderId: string, sellerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ad: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== sellerId) throw new BadRequestException('Unauthorized');
    if (order.status !== OrderStatus.PENDING_SELLER) {
      throw new BadRequestException(`Cannot approve order in ${order.status} state`);
    }

    const isSellAd = order.ad.type === AdType.SELL;
    const cryptoAmount = new Decimal(order.cryptoAmount.toString());
    const fiatAmount = new Decimal(order.fiatAmount.toString());

    const buyFeePercent = await this.getFeePercent('trade_buy_fee_percent');
    const sellFeePercent = await this.getFeePercent('trade_sell_fee_percent');
    const buyerFee = cryptoAmount.times(buyFeePercent / 100).toDecimalPlaces(8);
    const sellerFee = fiatAmount.times(sellFeePercent / 100).toDecimalPlaces(2);

    // Direction-aware role resolution. The crypto buyer always pays NGN:
    //   SELL ad: ad owner sells crypto, responder buys crypto with NGN
    //   BUY  ad: ad owner buys crypto with NGN, responder sells crypto
    const cryptoSellerId = isSellAd ? order.sellerId : order.buyerId;
    const cryptoBuyerId = isSellAd ? order.buyerId : order.sellerId;
    const fiatPayerId = cryptoBuyerId;
    const fiatReceiverId = cryptoSellerId;

    const feeWallet = await this.platformService.getPlatformFeeWallet(order.ad.asset);

    const settlement = await this.prisma.$transaction(async (tx) => {
      // --- STAGE 1: Transition status to APPROVED (Locks crypto logic) ---
      const approvedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.APPROVED,
          version: { increment: 1 },
        },
      });

      // --- STAGE 2: Lock crypto from the crypto seller (Optimistic Lock) ---
      const sellerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: cryptoSellerId, currency: order.ad.asset } },
      });
      if (!sellerCryptoWallet) throw new InternalServerErrorException('Crypto seller wallet not found');
      if (new Decimal(sellerCryptoWallet.balance.toString()).lessThan(cryptoAmount)) {
        throw new BadRequestException('Seller has insufficient crypto balance to lock');
      }

      const lockCryptoResult = await tx.wallet.updateMany({
        where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
        data: {
          balance: { decrement: cryptoAmount },
          reservedBalance: { increment: cryptoAmount },
          version: { increment: 1 },
        },
      });
      if (lockCryptoResult.count === 0) throw new InternalServerErrorException('Conflict locking seller crypto');

      // --- STAGE 3: Transfer Crypto (Debit seller escrow, Credit buyer available) ---
      const transferCryptoResult = await tx.wallet.updateMany({
        where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version + 1 }, // we incremented once
        data: {
          reservedBalance: { decrement: cryptoAmount },
          version: { increment: 1 },
        },
      });
      if (transferCryptoResult.count === 0) throw new InternalServerErrorException('Conflict transferring seller crypto');

      const buyerCryptoWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: cryptoBuyerId, currency: order.ad.asset } },
      });
      if (!buyerCryptoWallet) throw new InternalServerErrorException('Crypto buyer wallet not found');

      const creditBuyerCryptoResult = await tx.wallet.updateMany({
        where: { id: buyerCryptoWallet.id, version: buyerCryptoWallet.version },
        data: {
          balance: { increment: cryptoAmount.minus(buyerFee) },
          version: { increment: 1 },
        },
      });
      if (creditBuyerCryptoResult.count === 0) throw new InternalServerErrorException('Conflict crediting buyer crypto');

      // --- STAGE 4: Credit fiat receiver (Debit fiat payer reserved NGN) ---
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatPayerId, currency: Currency.NGN } },
      });
      if (!buyerFiatWallet) throw new InternalServerErrorException('Fiat payer wallet not found');

      const releaseReservedFiatResult = await tx.wallet.updateMany({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          reservedBalance: { decrement: fiatAmount },
          version: { increment: 1 },
        },
      });
      if (releaseReservedFiatResult.count === 0) throw new InternalServerErrorException('Conflict releasing fiat reserve');

      const sellerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatReceiverId, currency: Currency.NGN } },
      });
      if (!sellerFiatWallet) throw new InternalServerErrorException('Fiat receiver wallet not found');

      const creditSellerFiatResult = await tx.wallet.updateMany({
        where: { id: sellerFiatWallet.id, version: sellerFiatWallet.version },
        data: {
          balance: { increment: fiatAmount.minus(sellerFee) },
          version: { increment: 1 },
        },
      });
      if (creditSellerFiatResult.count === 0) throw new InternalServerErrorException('Conflict crediting fiat receiver');

      // --- STAGE 5: Update Ad Quantity (Optimistic Lock) ---
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

      // --- STAGE 6: Generate Audit Logs (LedgerEntries) ---
      const ledgerData: any[] = [
        {
          walletId: buyerFiatWallet.id,
          orderId: order.id,
          amount: fiatAmount.negated(),
          type: LedgerType.TRADE_SETTLEMENT,
          reference: `SETTLE-NGN-PAYER-${order.id}`,
          balanceAfter: new Decimal(buyerFiatWallet.balance.toString()),
        },
        {
          walletId: sellerFiatWallet.id,
          orderId: order.id,
          amount: fiatAmount.minus(sellerFee),
          type: LedgerType.TRADE_SETTLEMENT,
          reference: `SETTLE-NGN-RECEIVER-${order.id}`,
          balanceAfter: new Decimal(sellerFiatWallet.balance.toString()).plus(fiatAmount.minus(sellerFee)),
        },
        {
          walletId: sellerFiatWallet.id,
          orderId: order.id,
          amount: sellerFee.negated(),
          type: LedgerType.FEE,
          reference: `FEE-NGN-RECEIVER-${order.id}`,
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
          walletId: buyerCryptoWallet.id,
          orderId: order.id,
          amount: buyerFee.negated(),
          type: LedgerType.FEE,
          reference: `FEE-CRYPTO-BUYER-${order.id}`,
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
      ];

      // Platform fee wallet is the ledger home for the on-chain buyer fee leg.
      if (feeWallet) {
        const feeWalletRow = await tx.wallet.findUnique({ where: { id: feeWallet.id } });
        if (feeWalletRow) {
          ledgerData.push({
            walletId: feeWallet.id,
            orderId: order.id,
            amount: buyerFee,
            type: LedgerType.FEE,
            reference: `FEE-CRYPTO-PLATFORM-${order.id}`,
            balanceAfter: new Decimal(feeWalletRow.balance.toString()).plus(buyerFee),
          });
        }
      }

      await tx.ledgerEntry.createMany({ data: ledgerData });

      // --- STAGE 7: Complete Order ---
      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          feeAmount: buyerFee.plus(sellerFee),
          version: approvedOrder.version + 1, // Incremented once for approved, once here
        },
      });

      // 8. Emit Event
      this.eventEmitter.emit('order.completed', finalOrder);

      return { finalOrder, sellerCryptoWallet, buyerCryptoWallet };
    });

    // Trades are settled purely on the internal ledger. On-chain movement
    // between users is intentionally not broadcast: deposits and withdrawals
    // reconcile against user-owned addresses instead (see crypto module).
    return settlement.finalOrder;
  }

  async declineOrder(orderId: string, initiatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ad: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING_SELLER && order.status !== OrderStatus.CREATED) {
        throw new BadRequestException(`Cannot decline/cancel order in ${order.status} state`);
      }

      const fiatAmount = new Decimal(order.fiatAmount.toString());
      const { fiatPayerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);

      // Refund the fiat payer's reserved NGN (Optimistic Lock)
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatPayerId, currency: Currency.NGN } },
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

  async expireOrder(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ad: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING_SELLER && order.status !== OrderStatus.CREATED) {
        throw new BadRequestException(`Cannot expire order in ${order.status} state`);
      }

      const fiatAmount = new Decimal(order.fiatAmount.toString());
      const { fiatPayerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);

      // Refund the fiat payer's reserved NGN (Optimistic Lock)
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatPayerId, currency: Currency.NGN } },
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
          status: OrderStatus.EXPIRED,
          version: { increment: 1 },
        },
      });

      this.eventEmitter.emit('order.expired', finalOrder);
      return finalOrder;
    });
  }

  async flagFraud(orderId: string, initiatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ad: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.fraudFlagged) {
        throw new BadRequestException('Order is already flagged as fraud');
      }

      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.DECLINED ||
        order.status === OrderStatus.EXPIRED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new BadRequestException(`Cannot flag order in ${order.status} state`);
      }

      const fiatAmount = new Decimal(order.fiatAmount.toString());
      const { fiatPayerId, cryptoSellerId } = this.resolveRoles(order.ad.type, order.buyerId, order.sellerId);

      // 1. Refund the fiat payer's reserved NGN
      const buyerFiatWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: fiatPayerId, currency: Currency.NGN } },
      });
      if (!buyerFiatWallet) throw new InternalServerErrorException('Fiat payer wallet not found');

      const refundFiatResult = await tx.wallet.updateMany({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { increment: fiatAmount },
          reservedBalance: { decrement: fiatAmount },
          version: { increment: 1 },
        },
      });
      if (refundFiatResult.count === 0) throw new InternalServerErrorException('Conflict refunding fiat payer');

      // 2. Refund crypto seller's locked crypto if it was locked.
      if (order.status === OrderStatus.APPROVED) {
        const cryptoAmount = new Decimal(order.cryptoAmount.toString());
        const sellerCryptoWallet = await tx.wallet.findUnique({
          where: { userId_currency: { userId: cryptoSellerId, currency: order.ad.asset } },
        });
        if (!sellerCryptoWallet) throw new InternalServerErrorException('Crypto seller wallet not found');

        const refundCryptoResult = await tx.wallet.updateMany({
          where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
          data: {
            balance: { increment: cryptoAmount },
            reservedBalance: { decrement: cryptoAmount },
            version: { increment: 1 },
          },
        });
        if (refundCryptoResult.count === 0) throw new InternalServerErrorException('Conflict refunding seller crypto');
      }

      // 3. Flag as fraud and transition to CANCELLED
      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          fraudFlagged: true,
          status: OrderStatus.CANCELLED,
          version: { increment: 1 },
        },
      });

      this.eventEmitter.emit('order.fraud_flagged', { order: finalOrder, initiatorId });
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
