import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../core/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Currency, LedgerType, AdType } from '@src/generated/client';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Decimal } from '@src/generated/client/runtime/library';
import { PlatformService } from '../crypto/platform.service';

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
    platformFeeConfig: {
      findUnique: jest.fn(),
    },
  };

  const mockEventEmitter2 = {
    emit: jest.fn(),
  };

  const mockPlatformService = {
    getPlatformFeeWallet: jest.fn(),
    getPlatformUserId: jest.fn(),
    ensurePlatformWallets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter2 },
        { provide: PlatformService, useValue: mockPlatformService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.resetAllMocks();

    // Re-establish shared implementations (resetAllMocks clears them).
    mockPrismaService.$transaction.mockImplementation((cb) => cb(mockTransactionClient));
    mockPrismaService.platformFeeConfig.findUnique.mockResolvedValue({ value: new Decimal('0.5') });
  });

  describe('createOrder', () => {
    const buyerId = 'buyer-uuid';
    const sellerId = 'seller-uuid';
    const adId = 'ad-uuid';
    const dto = { adId, fiatAmount: 10000 };

    const mockAd = (type: AdType = AdType.SELL) => ({
      id: adId,
      sellerId,
      type,
      price: new Decimal('1000'),
      quantity: new Decimal('50'),
      minLimit: new Decimal('5000'),
      maxLimit: new Decimal('20000'),
      asset: Currency.USDT,
      status: 'ACTIVE',
    });

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
      mockTransactionClient.ad.findUnique.mockResolvedValue({ ...mockAd(), sellerId: buyerId });

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if fiatAmount is below limit', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd());
      const lowDto = { adId, fiatAmount: 1000 };

      await expect(service.createOrder(buyerId, lowDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if fiat payer has insufficient balance', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd());
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce({ ...mockBuyerWallet, balance: new Decimal('1000') }) // fiat payer NGN
        .mockResolvedValueOnce(mockSellerWallet); // cryptoSeller USDT

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cryptoSeller has insufficient crypto balance', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd());
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockBuyerWallet)
        .mockResolvedValueOnce({ ...mockSellerWallet, balance: new Decimal('5') });

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if optimistic lock fails during reserving fiat', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd());
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockBuyerWallet)
        .mockResolvedValueOnce(mockSellerWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 0 }); // conflict

      await expect(service.createOrder(buyerId, dto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should successfully create SELL order and reserve fiat from responder (buyer)', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd(AdType.SELL));
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

      // Fiat reserved from the responder (buyer) for a SELL ad
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockBuyerWallet.id, version: mockBuyerWallet.version },
        data: {
          balance: { decrement: new Decimal('10000') },
          reservedBalance: { increment: new Decimal('10000') },
          version: { increment: 1 },
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(Object));
      expect(result.status).toBe(OrderStatus.PENDING_SELLER);
    });

    it('should successfully create BUY order and reserve fiat from the ad owner (seller)', async () => {
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd(AdType.BUY));

      // For a BUY ad: fiat payer is ad owner (sellerId), cryptoSeller is responder (buyerId)
      const sellerNgnWallet = {
        id: 'seller-ngn-wallet-uuid',
        userId: sellerId,
        currency: Currency.NGN,
        balance: new Decimal('15000'),
        reservedBalance: new Decimal('0'),
        version: 1,
      };
      const responderCryptoWallet = {
        id: 'responder-crypto-wallet-uuid',
        userId: buyerId,
        currency: Currency.USDT,
        balance: new Decimal('50'),
        reservedBalance: new Decimal('0'),
        version: 1,
      };
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(sellerNgnWallet) // fiat payer = ad owner
        .mockResolvedValueOnce(responderCryptoWallet); // cryptoSeller = responder

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

      // Fiat reserved from the AD OWNER (sellerId) for a BUY ad
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: sellerNgnWallet.id, version: sellerNgnWallet.version },
        data: {
          balance: { decrement: new Decimal('10000') },
          reservedBalance: { increment: new Decimal('10000') },
          version: { increment: 1 },
        },
      });
      expect(result.status).toBe(OrderStatus.PENDING_SELLER);
    });
  });

  describe('approveOrder', () => {
    const orderId = 'order-uuid';
    const sellerId = 'seller-uuid';
    const buyerId = 'buyer-uuid';

    const mockOrder = (type: AdType = AdType.SELL) => ({
      id: orderId,
      adId: 'ad-uuid',
      buyerId,
      sellerId,
      status: OrderStatus.PENDING_SELLER,
      fiatAmount: new Decimal('10000'),
      cryptoAmount: new Decimal('10'),
      ad: {
        asset: Currency.USDT,
        type,
      },
    });

    const mockAd = {
      id: 'ad-uuid',
      quantity: new Decimal('50'),
      version: 1,
    };

    const mockSellerCryptoWallet = {
      id: 'seller-crypto-wallet-uuid',
      address: '0xSeller',
      balance: new Decimal('50'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    const mockBuyerCryptoWallet = {
      id: 'buyer-crypto-wallet-uuid',
      address: '0xBuyer',
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

    const mockFeeWallet = {
      id: 'platform-fee-wallet-uuid',
      address: '0xFee',
      balance: new Decimal('0'),
      reservedBalance: new Decimal('0'),
      version: 1,
    };

    it('should throw NotFoundException if order is not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.approveOrder(orderId, sellerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if unauthorized user tries to approve', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder());

      await expect(service.approveOrder(orderId, 'wrong-seller-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order status is not PENDING_SELLER', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder(),
        status: OrderStatus.COMPLETED,
      });

      await expect(service.approveOrder(orderId, sellerId)).rejects.toThrow(BadRequestException);
    });

    it('should settle a SELL order (SELL ad: responder buys crypto)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder(AdType.SELL));
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue(mockFeeWallet);

      mockTransactionClient.order.update.mockResolvedValueOnce({
        ...mockOrder(AdType.SELL),
        status: OrderStatus.APPROVED,
        version: 1,
      });

      // Wallet finds inside the transaction:
      // 1. cryptoSeller crypto (ad owner)
      // 2. crypto buyer crypto (responder)
      // 3. fiat payer NGN (responder)
      // 4. fiat receiver NGN (ad owner)
      // 5. platform fee wallet (ledger home for buyer fee)
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockSellerCryptoWallet)
        .mockResolvedValueOnce(mockBuyerCryptoWallet)
        .mockResolvedValueOnce(mockBuyerFiatWallet)
        .mockResolvedValueOnce(mockSellerFiatWallet)
        .mockResolvedValueOnce(mockFeeWallet);

      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.ad.updateMany.mockResolvedValue({ count: 1 });

      const mockCompletedOrder = {
        ...mockOrder(AdType.SELL),
        status: OrderStatus.COMPLETED,
        feeAmount: new Decimal('50.05'), // 0.05 USDT + 50 NGN
      };
      mockTransactionClient.order.update.mockResolvedValueOnce(mockCompletedOrder);

      const result = await service.approveOrder(orderId, sellerId);

      // Crypto locked from the ad owner (cryptoSeller)
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockSellerCryptoWallet.id, version: mockSellerCryptoWallet.version },
        data: {
          balance: { decrement: new Decimal('10') },
          reservedBalance: { increment: new Decimal('10') },
          version: { increment: 1 },
        },
      });

      // Crypto credited to responder (crypto buyer): 10 - 0.5% (0.05)
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockBuyerCryptoWallet.id, version: mockBuyerCryptoWallet.version },
        data: {
          balance: { increment: new Decimal('9.95') },
          version: { increment: 1 },
        },
      });

      // NGN credited to ad owner (fiat receiver): 10000 - 50
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: mockSellerFiatWallet.id, version: mockSellerFiatWallet.version },
        data: {
          balance: { increment: new Decimal('9950') },
          version: { increment: 1 },
        },
      });

      // Platform fee wallet credited with buyer fee in the ledger
      const ledgerData = mockTransactionClient.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(ledgerData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            walletId: mockFeeWallet.id,
            amount: new Decimal('0.05'),
            type: LedgerType.FEE,
          }),
        ]),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.completed', mockCompletedOrder);
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should settle a BUY order (BUY ad: ad owner buys crypto from responder)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder(AdType.BUY));
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue(mockFeeWallet);

      const responderCryptoWallet = {
        id: 'responder-crypto-wallet-uuid',
        address: '0xResponder',
        balance: new Decimal('50'),
        reservedBalance: new Decimal('0'),
        version: 1,
      };
      const adOwnerCryptoWallet = {
        id: 'adowner-crypto-wallet-uuid',
        address: '0xAdOwner',
        balance: new Decimal('0'),
        reservedBalance: new Decimal('0'),
        version: 1,
      };
      const adOwnerNgnWallet = {
        id: 'adowner-ngn-wallet-uuid',
        balance: new Decimal('5000'),
        reservedBalance: new Decimal('10000'),
        version: 1,
      };
      const responderNgnWallet = {
        id: 'responder-ngn-wallet-uuid',
        balance: new Decimal('0'),
        reservedBalance: new Decimal('0'),
        version: 1,
      };

      mockTransactionClient.order.update.mockResolvedValueOnce({
        ...mockOrder(AdType.BUY),
        status: OrderStatus.APPROVED,
        version: 1,
      });

      // Wallet finds:
      // 1. cryptoSeller = responder crypto
      // 2. crypto buyer = ad owner crypto
      // 3. fiat payer = ad owner NGN
      // 4. fiat receiver = responder NGN
      // 5. platform fee wallet
      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(responderCryptoWallet)
        .mockResolvedValueOnce(adOwnerCryptoWallet)
        .mockResolvedValueOnce(adOwnerNgnWallet)
        .mockResolvedValueOnce(responderNgnWallet)
        .mockResolvedValueOnce(mockFeeWallet);

      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.ad.updateMany.mockResolvedValue({ count: 1 });

      const mockCompletedOrder = {
        ...mockOrder(AdType.BUY),
        status: OrderStatus.COMPLETED,
        feeAmount: new Decimal('50.05'),
      };
      mockTransactionClient.order.update.mockResolvedValueOnce(mockCompletedOrder);

      const result = await service.approveOrder(orderId, sellerId);

      // Crypto locked from the RESPONDER (cryptoSeller for a BUY ad)
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: responderCryptoWallet.id, version: responderCryptoWallet.version },
        data: {
          balance: { decrement: new Decimal('10') },
          reservedBalance: { increment: new Decimal('10') },
          version: { increment: 1 },
        },
      });

      // Crypto credited to the AD OWNER (crypto buyer): 9.95
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: adOwnerCryptoWallet.id, version: adOwnerCryptoWallet.version },
        data: {
          balance: { increment: new Decimal('9.95') },
          version: { increment: 1 },
        },
      });

      // Ad owner's reserved NGN released
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: adOwnerNgnWallet.id, version: adOwnerNgnWallet.version },
        data: {
          reservedBalance: { decrement: new Decimal('10000') },
          version: { increment: 1 },
        },
      });

      // Responder receives NGN: 10000 - 50
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: responderNgnWallet.id, version: responderNgnWallet.version },
        data: {
          balance: { increment: new Decimal('9950') },
          version: { increment: 1 },
        },
      });

      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should settle ledger-only when the fee wallet has no on-chain address', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder(AdType.SELL));
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue({ id: 'platform-fee-wallet-uuid', address: null });

      mockTransactionClient.order.update.mockResolvedValueOnce({
        ...mockOrder(AdType.SELL),
        status: OrderStatus.APPROVED,
        version: 1,
      });

      mockTransactionClient.wallet.findUnique
        .mockResolvedValueOnce(mockSellerCryptoWallet)
        .mockResolvedValueOnce(mockBuyerCryptoWallet)
        .mockResolvedValueOnce(mockBuyerFiatWallet)
        .mockResolvedValueOnce(mockSellerFiatWallet)
        .mockResolvedValueOnce({ id: 'platform-fee-wallet-uuid', address: null, balance: new Decimal('0'), reservedBalance: new Decimal('0'), version: 1 });

      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.ad.findUnique.mockResolvedValue(mockAd);
      mockTransactionClient.ad.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValueOnce({
        ...mockOrder(AdType.SELL),
        status: OrderStatus.COMPLETED,
        feeAmount: new Decimal('50.05'),
      });

      const result = await service.approveOrder(orderId, sellerId);

      // No on-chain transfer is ever broadcast; the fee wallet ledger row is
      // still created regardless of its address.
      const ledgerData = mockTransactionClient.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(ledgerData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            walletId: 'platform-fee-wallet-uuid',
            amount: new Decimal('0.05'),
            type: LedgerType.FEE,
          }),
        ]),
      );
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe('declineOrder', () => {
    it('should successfully refund the fiat payer reserved NGN and decline a SELL order', async () => {
      const order = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        fiatAmount: new Decimal('1000'),
        status: OrderStatus.PENDING_SELLER,
        ad: { type: AdType.SELL },
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

      // SELL ad: fiat payer is the responder (buyerId)
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

    it('should refund the AD OWNER (fiat payer) when declining a BUY order', async () => {
      const order = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        fiatAmount: new Decimal('1000'),
        status: OrderStatus.PENDING_SELLER,
        ad: { type: AdType.BUY },
      };

      const adOwnerNgnWallet = {
        id: 'adowner-ngn-wallet-uuid',
        version: 1,
      };

      mockTransactionClient.order.findUnique.mockResolvedValue(order);
      mockTransactionClient.wallet.findUnique.mockResolvedValue(adOwnerNgnWallet);
      mockTransactionClient.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockTransactionClient.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.DECLINED,
      });

      await service.declineOrder('order-uuid', 'seller-uuid');

      // BUY ad: fiat payer is the ad owner (sellerId)
      expect(mockTransactionClient.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId_currency: { userId: 'seller-uuid', currency: Currency.NGN } },
      });
      expect(mockTransactionClient.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: adOwnerNgnWallet.id, version: adOwnerNgnWallet.version },
        data: {
          balance: { increment: new Decimal('1000') },
          reservedBalance: { decrement: new Decimal('1000') },
          version: { increment: 1 },
        },
      });
    });
  });

  describe('expireOrder', () => {
    it('should successfully refund the fiat payer reserved NGN and expire order', async () => {
      const order = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        fiatAmount: new Decimal('1000'),
        status: OrderStatus.PENDING_SELLER,
        ad: { type: AdType.SELL },
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
      ad: { asset: Currency.USDT, type: AdType.SELL },
    };

    const orderApproved = {
      ...orderPending,
      status: OrderStatus.APPROVED,
    };

    const buyerFiatWallet = { id: 'buyer-fiat-wallet-uuid', version: 1 };
    const sellerCryptoWallet = { id: 'seller-crypto-wallet-uuid', version: 1 };

    it('should refund the fiat payer and cancel order when state is PENDING_SELLER', async () => {
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

    it('should refund fiat payer and refund cryptoSeller locked crypto when state is APPROVED', async () => {
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
