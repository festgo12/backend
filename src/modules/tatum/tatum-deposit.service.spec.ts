import { Test, TestingModule } from '@nestjs/testing';
import { TatumDepositService } from './tatum-deposit.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumRiskService } from './tatum-risk.service';
import { TatumWebhookService } from './tatum-webhook.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency, LedgerType } from '@src/generated/client';

describe('TatumDepositService', () => {
  let service: TatumDepositService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    wallet: { findUnique: jest.fn(), findMany: jest.fn() },
    walletTransaction: { findUnique: jest.fn(), findMany: jest.fn() },
    balanceSnapshot: { create: jest.fn() },
  };

  const mockWalletService = {
    updateTransactionStatus: jest.fn(),
    createTransaction: jest.fn(),
  };

  const mockTatumWallet = {
    mapCurrencyToV4Chain: jest.fn(),
  };

  const mockRiskService = {
    screenDeposit: jest.fn(),
  };

  const mockWebhookService = {
    markTransactionAsCompleted: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        const map: Record<string, string> = {
          TATUM_API_KEY: 'api-key',
          TATUM_MIN_CONFIRMATIONS: '1',
          TATUM_NETWORK: 'testnet',
        };
        return map[key] ?? defaultValue;
      },
    );
    mockTatumWallet.mapCurrencyToV4Chain.mockImplementation((currency) =>
      currency === 'BTC' ? 'BITCOIN' : 'ETH',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumDepositService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: TatumWalletService, useValue: mockTatumWallet },
        { provide: TatumRiskService, useValue: mockRiskService },
        { provide: TatumWebhookService, useValue: mockWebhookService },
      ],
    }).compile();

    service = module.get<TatumDepositService>(TatumDepositService);
  });

  describe('confirmWithdrawal', () => {
    it('confirms a pending crypto withdrawal once confirmations reach the threshold', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        type: LedgerType.WITHDRAWAL,
        status: 'PENDING',
        reference: '0xWithdrawalHash',
        walletId: 'wallet-1',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.ETH,
      });
      jest.spyOn(service as any, 'fetchConfirmations').mockResolvedValue(3);

      const result = await service.confirmWithdrawal('0xWithdrawalHash');

      expect(
        mockWebhookService.markTransactionAsCompleted,
      ).toHaveBeenCalledWith('0xWithdrawalHash');
      expect(result).toEqual({ confirmed: true, confirmations: 3 });
    });

    it('returns not_a_withdrawal for deposit transactions', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        reference: '0xDepositHash',
        walletId: 'wallet-1',
      });

      const result = await service.confirmWithdrawal('0xDepositHash');

      expect(result.reason).toBe('not_a_withdrawal');
      expect(
        mockWebhookService.markTransactionAsCompleted,
      ).not.toHaveBeenCalled();
    });

    it('returns non_crypto_asset for fiat wallets', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        type: LedgerType.WITHDRAWAL,
        status: 'PENDING',
        reference: 'ngn-ref',
        walletId: 'wallet-1',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.NGN,
      });

      const result = await service.confirmWithdrawal('ngn-ref');

      expect(result.reason).toBe('non_crypto_asset');
    });
  });

  describe('confirmPendingWithdrawals', () => {
    it('scans pending withdrawals and confirms eligible ones', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          type: LedgerType.WITHDRAWAL,
          status: 'PENDING',
          reference: '0xWithdrawalHash',
          walletId: 'wallet-1',
        },
      ]);
      jest
        .spyOn(service, 'confirmWithdrawal')
        .mockResolvedValue({ confirmed: true, confirmations: 5 });

      const result = await service.confirmPendingWithdrawals();

      expect(mockPrismaService.walletTransaction.findMany).toHaveBeenCalledWith(
        {
          where: {
            type: LedgerType.WITHDRAWAL,
            status: 'PENDING',
            wallet: {
              currency: {
                in: [Currency.BTC, Currency.ETH, Currency.USDT, Currency.USDC],
              },
            },
          },
          take: 100,
        },
      );
      expect(result).toEqual({ scanned: 1, confirmed: 1 });
    });
  });
});
