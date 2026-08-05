import { Test, TestingModule } from '@nestjs/testing';
import {
  TatumPlatformService,
  PLATFORM_WALLET_INDEX_BASE,
  PLATFORM_EMAIL,
} from './tatum-platform.service';
import { PrismaService } from '../../core/database/prisma.service';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumWebhookService } from './tatum-webhook.service';
import { Currency, Role } from '@src/generated/client';

describe('TatumPlatformService', () => {
  let service: TatumPlatformService;

  const mockPrismaService = {
    user: { upsert: jest.fn(), findUnique: jest.fn() },
    wallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const mockTatumWallet = {
    getOrGenerateXpub: jest.fn(),
    getAddressIndex: jest.fn(),
    generateAddress: jest.fn(),
  };

  const mockTatumWebhook = {
    registerAddressSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumPlatformService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TatumWalletService, useValue: mockTatumWallet },
        { provide: TatumWebhookService, useValue: mockTatumWebhook },
      ],
    }).compile();

    service = module.get<TatumPlatformService>(TatumPlatformService);

    jest.resetAllMocks();
  });

  describe('ensurePlatformWallets', () => {
    it('creates the platform user and a wallet per crypto currency, assigning derived addresses', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockImplementation(({ data }) => ({
        id: `created-${data.currency}`,
        address: null,
        ...data,
      }));
      mockPrismaService.wallet.update.mockImplementation(({ data }) => ({
        id: 'fee-wallet-uuid',
        address: data.address,
      }));
      mockTatumWallet.getOrGenerateXpub.mockResolvedValue('xpub...');
      mockTatumWallet.getAddressIndex.mockReturnValue(7);
      mockTatumWallet.generateAddress.mockResolvedValue('0xDerivedFeeAddress');
      mockTatumWebhook.registerAddressSubscription.mockResolvedValue({});

      const result = await service.ensurePlatformWallets();

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { email: PLATFORM_EMAIL },
        update: { isSystem: true },
        create: expect.objectContaining({
          email: PLATFORM_EMAIL,
          role: Role.SUPER_ADMIN,
          isSystem: true,
        }),
      });

      expect(mockPrismaService.wallet.create).toHaveBeenCalledTimes(4);
      expect(mockTatumWallet.generateAddress).toHaveBeenCalledWith(
        Currency.BTC,
        'xpub...',
        PLATFORM_WALLET_INDEX_BASE + 7,
      );
      expect(result.wallets).toHaveLength(4);
      expect(
        result.wallets.every((w) => w.address === '0xDerivedFeeAddress'),
      ).toBe(true);
      expect(
        mockTatumWebhook.registerAddressSubscription,
      ).toHaveBeenCalledTimes(4);
    });

    it('keeps existing addresses and skips re-derivation', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'fee-wallet-uuid',
        currency: Currency.USDT,
        address: '0xExistingFeeAddress',
      });

      const result = await service.ensurePlatformWallets();

      expect(mockTatumWallet.generateAddress).not.toHaveBeenCalled();
      expect(mockPrismaService.wallet.update).not.toHaveBeenCalled();
      expect(
        mockTatumWebhook.registerAddressSubscription,
      ).not.toHaveBeenCalled();
      expect(result.wallets).toHaveLength(4);
      expect(result.wallets[0].address).toBe('0xExistingFeeAddress');
    });
  });

  describe('getPlatformFeeWallet', () => {
    it('returns the internal fee wallet for a currency', async () => {
      jest
        .spyOn(service, 'ensurePlatformWallets')
        .mockResolvedValue({ userId: 'platform-user-uuid', wallets: [] });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'fee-wallet-uuid',
        currency: Currency.USDT,
        address: '0xFee',
      });

      const result = await service.getPlatformFeeWallet(Currency.USDT);

      expect(service.ensurePlatformWallets).toHaveBeenCalled();
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: {
          userId_currency: {
            userId: 'platform-user-uuid',
            currency: Currency.USDT,
          },
        },
      });
      expect(result).toEqual({
        id: 'fee-wallet-uuid',
        currency: Currency.USDT,
        address: '0xFee',
      });
    });
  });

  describe('getPlatformUserId', () => {
    it('returns the platform user id when the user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'platform-user-uuid',
      });

      const id = await service.getPlatformUserId();

      expect(id).toBe('platform-user-uuid');
      expect(service.ensurePlatformWallets).toBeDefined();
    });

    it('bootstraps the platform user when missing', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'platform-user-uuid' });
      jest
        .spyOn(service, 'ensurePlatformWallets')
        .mockResolvedValue({ userId: 'platform-user-uuid', wallets: [] });

      const id = await service.getPlatformUserId();

      expect(service.ensurePlatformWallets).toHaveBeenCalled();
      expect(id).toBe('platform-user-uuid');
    });
  });
});
