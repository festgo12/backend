import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../core/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Currency, LedgerType } from '@src/generated/client';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Decimal } from '@src/generated/client/runtime/library';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockTransactionClient = {
    ad: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    ledgerEntry: {
      createMany: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((cb) => cb(mockTransactionClient)),
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEventEmitter2 = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter2 },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const buyerId = 'buyer-uuid';
    const sellerId = 'seller-uuid';
    const adId = 'ad-uuid';
    const dto = { adId, fiatAmount: 10000 };

    const mockAd = {
      id: adId,
      sellerId,
      price: new Decimal('1000'),
      quantity: new Decimal('50'),
      minLimit: new Decimal('5000'),
      maxLimit: new Decimal('20000'),
      asset: Currency.USDT,
      status: 'ACTIVE',
    };

    const mockBuyerWallet = {
      id: 'buyer-wallet-uuid',
      userId: buyerId,
      currency: Currency.NGN,
      balance: new Decimal('15000'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    const mockSellerWallet = {
      id: 'seller-wallet-uuid',
      userId: sellerId,
      currency: Currency.USDT,
      balance: new Decimal('50'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    it('should throw NotFoundException if ad is not found or inactive', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(null);

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if buyer is the seller', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue({ ...mockAd, sellerId: buyerId });

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if fiatAmount is below limit', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      const lowDto = { adId, fiatAmount: 1000 };

      await expect(service.createOrder(buyerId, lowDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if buyer has insufficient fiat balance', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce({ ...mockBuyerWallet, balance: new Decimal('1000') }) // buyer NGN
        .mockResolvedValueOnce(mockSellerWallet); // seller USDT

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if seller has insufficient crypto balance', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockBuyerWallet)
        .mockResolvedValueOnce({ ...mockSellerWallet, balance: new Decimal('5') }); // seller USDT

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if optimistic lock fails during reserving fiat', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockBuyerWallet)
        .mockResolvedValueOnce(mockSellerWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 0 }); // conflict

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should successfully create order and reserve fiat', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockBuyerWallet)
        .mockResolvedValueOnce(mockSellerWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      
      const mockCreatedOrder = {
        id: 'order-uuid',
        adId,
        buyerId,
        sellerId,
        status: OrderStatus.CREATED,
        fiatAmount: new Decimal('10000'),
        cryptoAmount: new Decimal('10'),
        feeAmount: new Decimal('0'),
      };

      mockTransactionClient.order.create.mockResolvedValue(mockCreatedOrder);
      mockTransactionClient.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        status: OrderStatus.PENDING_SELLER,
      });

      const result = await service.createOrder(buyerId, dto);

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockBuyerWallet.id, version: mockBuyerWallet.version },
        data: {
          balance: { decrement: new Decimal('10000') },
          reservedBalance: { increment: new Decimal('10000') },
          version: { increment: 1 },
        },
      });

      expect(mockTransactionClient.order.create).toHaveBeenCalled();
      expect(mockTransactionClient.order.update).toHaveBeenCalledWith({
        where: { id: mockCreatedOrder.id },
        data: {
          status: OrderStatus.PENDING_SELLER,
          version: { increment: 1 },
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(Object));
      expect(result.status).toBe(OrderStatus.PENDING_SELLER);
    });
  });

  describe('approveOrder', () => {
    const orderId = 'order-uuid';
    const sellerId = 'seller-uuid';
    const buyerId = 'buyer-uuid';

    const mockOrder = {
      id: orderId,
      adId: 'ad-uuid',
      buyerId,
      sellerId,
      status: OrderStatus.PENDING_SELLER,
      fiatAmount: new Decimal('10000'),
      cryptoAmount: new Decimal('10'),
      ad: {
        asset: Currency.USDT,
      },
    };

    const mockAd = {
      id: 'ad-uuid',
      quantity: new Decimal('50'),
      version: 1,
    };

    const mockSellerCryptoWallet = {
      id: 'seller-crypto-wallet-uuid',
      balance: new Decimal('50'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    const mockBuyerCryptoWallet = {
      id: 'buyer-crypto-wallet-uuid',
      balance: new Decimal('0'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    const mockBuyerFiatWallet = {
      id: 'buyer-fiat-wallet-uuid',
      balance: new Decimal('5000'),
      reservedBalance: new Decimal('10000'),
      version: 1,
    };

    const mockSellerFiatWallet = {
      id: 'seller-fiat-wallet-uuid',
      balance: new Decimal('0'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    it('should throw NotFoundException if order is not found', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue(null);

      await expect(service.approveOrder(orderId, sellerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if unauthorized user tries to approve', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.approveOrder(orderId, 'wrong-seller-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order status is not PENDING_SELLER', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      });

      await expect(service.approveOrder(orderId, sellerId)).rejects.toThrow(BadRequestException);
    });

    it('should successfully complete the happy path', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue(mockOrder);
      mockTransactionClient.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.APPROVED,
        version: 1,
      });

      // Wallet returns in order:
      // 1. Seller crypto wallet (lock crypto)
      // 2. Buyer crypto wallet (credit crypto)
      // 3. Buyer NGN wallet (debit reserved NGN)
      // 4. Seller NGN wallet (credit seller NGN)
      // 5. Ad retrieve (update quantity)
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockSellerCryptoWallet) // Stage 2
        .mockResolvedValueOnce(mockBuyerCryptoWallet) // Stage 3
        .mockResolvedValueOnce(mockBuyerFiatWallet) // Stage 4 - Buyer NGN
        .mockResolvedValueOnce(mockSellerFiatWallet); // Stage 4 - Seller NGN

      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.ad.updateMany.mockResolvedValue({ count: 1 });

      const mockCompletedOrder = {
        ...mockOrder,
        status: OrderStatus.COMPLETED,
        feeAmount: new Decimal('50.05'), // 0.05 USDT + 50 NGN
      };
      mockTransactionClient.order.update.mockResolvedValueOnce(mockCompletedOrder);

      const result = await service.approveOrder(orderId, sellerId);

      // Verify locks were invoked:
      // Locking crypto
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockSellerCryptoWallet.id, version: mockSellerCryptoWallet.version },
        data: {
          balance: { decrement: new Decimal('10') },
          reservedBalance: { increment: new Decimal('10') },
          version: { increment: 1 },
        },
      });

      // Releasing crypto from escrow & crediting buyer
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockSellerCryptoWallet.id, version: mockSellerCryptoWallet.version + 1 },
        data: {
          reservedBalance: { decrement: new Decimal('10') },
          version: { increment: 1 },
        },
      });

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockBuyerCryptoWallet.id, version: mockBuyerCryptoWallet.version },
        data: {
          balance: { increment: new Decimal('9.95') }, // 10 USDT - 0.5% (0.05 USDT)
          version: { increment: 1 },
        },
      });

      // Transferring NGN
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockBuyerFiatWallet.id, version: mockBuyerFiatWallet.version },
        data: {
          reservedBalance: { decrement: new Decimal('10000') },
          version: { increment: 1 },
        },
      });

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockSellerFiatWallet.id, version: mockSellerFiatWallet.version },
        data: {
          balance: { increment: new Decimal('9950') }, // 10000 - 50
          version: { increment: 1 },
        },
      });

      // General audit entries:
      expect(mockTransactionClient.ledgerEntry.createMany).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.completed', mockCompletedOrder);
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe('declineOrder', () => {
    it('should successfully refund buyer reserved NGN and decline order', async () => {
      const order = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        fiatAmount: new Decimal('1000'),
        status: OrderStatus.PENDING_SELLER,
      };

      const buyerFiatWallet = {
        id: 'buyer-fiat-wallet-uuid',
        version: 1,
      };

      mockTransactionClient.order.findUnique.mockResolvedValue(order);
      mockTransactionClient.wallet.findUnique.mockResolvedValue(buyerFiatWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.DECLINED,
      });

      const result = await service.declineOrder('order-uuid', 'seller-uuid');

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { increment: new Decimal('1000') },
          reservedBalance: { decrement: new Decimal('1000') },
          version: { increment: 1 },
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.declined', expect.any(Object));
      expect(result.status).toBe(OrderStatus.DECLINED);
    });
  });

  describe('expireOrder', () => {
    it('should successfully refund buyer reserved NGN and expire order', async () => {
      const order = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        fiatAmount: new Decimal('1000'),
        status: OrderStatus.PENDING_SELLER,
      };

      const buyerFiatWallet = {
        id: 'buyer-fiat-wallet-uuid',
        version: 1,
      };

      mockTransactionClient.order.findUnique.mockResolvedValue(order);
      mockTransactionClient.wallet.findUnique.mockResolvedValue(buyerFiatWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.EXPIRED,
      });

      const result = await service.expireOrder('order-uuid');

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { increment: new Decimal('1000') },
          reservedBalance: { decrement: new Decimal('1000') },
          version: { increment: 1 },
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.expired', expect.any(Object));
      expect(result.status).toBe(OrderStatus.EXPIRED);
    });
  });

  describe('flagFraud', () => {
    const buyerId = 'buyer-uuid';
    const sellerId = 'seller-uuid';

    const orderPending = {
      id: 'order-uuid',
      buyerId,
      sellerId,
      fiatAmount: new Decimal('10000'),
      cryptoAmount: new Decimal('10'),
      status: OrderStatus.PENDING_SELLER,
      fraudFlagged: false,
      ad: { asset: Currency.USDT },
    };

    const orderApproved = {
      ...orderPending,
      status: OrderStatus.APPROVED,
    };

    const buyerFiatWallet = { id: 'buyer-fiat-wallet-uuid', version: 1 };
    const sellerCryptoWallet = { id: 'seller-crypto-wallet-uuid', version: 1 };

    it('should refund buyer and cancel order when state is PENDING_SELLER', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue(orderPending);
      mockTransactionClient.wallet.findUnique.mockResolvedValueOnce(buyerFiatWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValue({
        ...orderPending,
        fraudFlagged: true,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.flagFraud('order-uuid', 'admin-uuid');

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: buyerFiatWallet.id, version: buyerFiatWallet.version },
        data: {
          balance: { increment: new Decimal('10000') },
          reservedBalance: { decrement: new Decimal('10000') },
          version: { increment: 1 },
        },
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.fraudFlagged).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.fraud_flagged', expect.any(Object));
    });

    it('should refund buyer and refund seller locked crypto when state is APPROVED', async () => {
      mockTransactionClient.order.findUnique.mockResolvedValue(orderApproved);
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(buyerFiatWallet)
        .mockResolvedValueOnce(sellerCryptoWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValue({
        ...orderApproved,
        fraudFlagged: true,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.flagFraud('order-uuid', 'admin-uuid');

      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledTimes(2);
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: sellerCryptoWallet.id, version: sellerCryptoWallet.version },
        data: {
          balance: { increment: new Decimal('10') },
          reservedBalance: { decrement: new Decimal('10') },
          version: { increment: 1 },
        },
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.fraudFlagged).toBe(true);
    });
  });
});
