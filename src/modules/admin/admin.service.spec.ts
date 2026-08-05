import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../core/database/prisma.service';
import { TatumWithdrawalService } from '../tatum/tatum-withdrawal.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
import { PaystackService } from '../paystack/paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { Currency } from '@src/generated/client';
import { PLATFORM_EMAIL } from '../tatum/tatum-platform.service';
import { Decimal } from '@src/generated/client/runtime/library';
import { BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let tatumWithdrawal: TatumWithdrawalService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    wallet: { findMany: jest.fn() },
  };

  const mockTatumWithdrawal = { sweepFeeWallet: jest.fn() };
  const mockExchangeRateService = { getAllRates: jest.fn() };
  const mockPaystackService = {};
  const mockWalletService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TatumWithdrawalService, useValue: mockTatumWithdrawal },
        { provide: TatumExchangeRateService, useValue: mockExchangeRateService },
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    tatumWithdrawal = module.get<TatumWithdrawalService>(TatumWithdrawalService);

    jest.resetAllMocks();
  });

  describe('getFeeWallets', () => {
    it('returns empty wallets when the platform user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getFeeWallets();

      expect(result).toEqual({ wallets: [], total: 0 });
    });

    it('maps fee wallet balances and ledger counts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'platform-user-uuid' });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        {
          id: 'fee-wallet-uuid',
          currency: Currency.USDT,
          address: '0x1111111111111111111111111111111111111111',
          balance: new Decimal('10'),
          reservedBalance: new Decimal('2'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { ledgerEntries: 3 },
        },
      ]);

      const result = await service.getFeeWallets();

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: PLATFORM_EMAIL } });
      expect(result.wallets).toEqual([
        expect.objectContaining({
          currency: Currency.USDT,
          address: '0x1111111111111111111111111111111111111111',
          balance: 10,
          reservedBalance: 2,
          available: 8,
          ledgerEntryCount: 3,
        }),
      ]);
      expect(result.total).toBe(1);
    });
  });

  describe('sweepFeeWallet', () => {
    const destination = '0x1111111111111111111111111111111111111111';

    it('throws BadRequestException when the destination address is missing', async () => {
      await expect(service.sweepFeeWallet(Currency.USDT, '')).rejects.toThrow(BadRequestException);
      expect(mockTatumWithdrawal.sweepFeeWallet).not.toHaveBeenCalled();
    });

    it('rejects NGN sweeps since NGN is ledger-only', async () => {
      await expect(service.sweepFeeWallet(Currency.NGN, destination)).rejects.toThrow(
        'NGN fee revenue is held in the ledger',
      );
      expect(mockTatumWithdrawal.sweepFeeWallet).not.toHaveBeenCalled();
    });

    it('delegates to the withdrawal service', async () => {
      mockTatumWithdrawal.sweepFeeWallet.mockResolvedValue({ txId: 'sweep-tx', status: 'PENDING' });

      const result = await service.sweepFeeWallet(Currency.USDT, destination, 25);

      expect(tatumWithdrawal.sweepFeeWallet).toHaveBeenCalledWith({
        currency: Currency.USDT,
        destinationAddress: destination,
        amount: 25,
      });
      expect(result).toEqual({ txId: 'sweep-tx', status: 'PENDING' });
    });
  });
});
