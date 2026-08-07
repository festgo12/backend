/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService, PLATFORM_EMAIL } from './platform.service';
import { PrismaService } from '../../core/database/prisma.service';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, Role } from '@src/generated/client';

describe('PlatformService', () => {
  let service: PlatformService;

  const mockPrismaService = {
    user: { upsert: jest.fn(), findUnique: jest.fn() },
    wallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    platformSetting: { upsert: jest.fn() },
  };

  const mockHdWallet = {
    getOrAssignDepositInfo: jest.fn(),
  };

  const mockDepositRegistry = {
    register: jest.fn(),
  };

  const mockCryptoConfig: {
    evmMasterXpub: string | null;
    btcMasterXpub: string | null;
  } = {
    evmMasterXpub: null,
    btcMasterXpub: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HdWalletService, useValue: mockHdWallet },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: CryptoConfigService, useValue: mockCryptoConfig },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);

    jest.resetAllMocks();
  });

  describe('ensurePlatformWallets', () => {
    it('creates the platform user and a wallet per crypto currency, assigning derived addresses', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockImplementation(
        ({ data }: { data: { currency: Currency } }) => ({
          id: `created-${data.currency}`,
          address: null,
          ...data,
        }),
      );
      mockPrismaService.wallet.update.mockImplementation(
        ({ data }: { data: { address: string } }) => ({
          id: 'fee-wallet-uuid',
          address: data.address,
        }),
      );
      mockHdWallet.getOrAssignDepositInfo.mockImplementation(
        (_userId: string, currency: Currency) => ({
          chain: currency === Currency.BTC ? 'BTC' : 'EVM',
          address: '0xDerivedFeeAddress',
          derivationIndex: 1000,
        }),
      );

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
      expect(mockPrismaService.wallet.update).toHaveBeenCalledTimes(4);
      expect(mockDepositRegistry.register).toHaveBeenCalledTimes(4);
      expect(result.wallets).toHaveLength(4);
      expect(
        result.wallets.every((w) => w.address === '0xDerivedFeeAddress'),
      ).toBe(true);
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

      expect(mockHdWallet.getOrAssignDepositInfo).not.toHaveBeenCalled();
      expect(mockPrismaService.wallet.update).not.toHaveBeenCalled();
      expect(mockDepositRegistry.register).not.toHaveBeenCalled();
      expect(result.wallets).toHaveLength(4);
      expect(result.wallets[0].address).toBe('0xExistingFeeAddress');
    });

    it('mirrors configured master xpubs into PlatformSetting', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'fee-wallet-uuid',
        currency: Currency.USDT,
        address: '0xExistingFeeAddress',
      });
      mockCryptoConfig.evmMasterXpub = 'xpub-evm';
      mockCryptoConfig.btcMasterXpub = 'xpub-btc';
      mockPrismaService.platformSetting.upsert.mockResolvedValue({});

      await service.ensurePlatformWallets();

      expect(mockPrismaService.platformSetting.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.platformSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'master_xpub_evm' },
        update: { value: 'xpub-evm' },
        create: { key: 'master_xpub_evm', value: 'xpub-evm' },
      });
      expect(mockPrismaService.platformSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'master_xpub_btc' },
        update: { value: 'xpub-btc' },
        create: { key: 'master_xpub_btc', value: 'xpub-btc' },
      });

      mockCryptoConfig.evmMasterXpub = null;
      mockCryptoConfig.btcMasterXpub = null;
    });

    it('skips PlatformSetting writes when no xpubs are configured', async () => {
      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'fee-wallet-uuid',
        currency: Currency.USDT,
        address: '0xExistingFeeAddress',
      });

      await service.ensurePlatformWallets();

      expect(mockPrismaService.platformSetting.upsert).not.toHaveBeenCalled();
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
