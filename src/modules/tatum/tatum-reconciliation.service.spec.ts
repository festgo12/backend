import { Test, TestingModule } from '@nestjs/testing';
import { TatumReconciliationService } from './tatum-reconciliation.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from '../wallet/ledger.service';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumPlatformService } from './tatum-platform.service';
import { Currency, LedgerType } from '@src/generated/client';
import { Decimal } from '@src/generated/client/runtime/library';
import { STABLECOIN_CONTRACTS } from './tatum-deposit.service';
import { of } from 'rxjs';

describe('TatumReconciliationService', () => {
  let service: TatumReconciliationService;

  const mockConfigService = { get: jest.fn() };
  const mockHttpService = { get: jest.fn() };
  const mockPrismaService = {
    wallet: { aggregate: jest.fn(), findMany: jest.fn() },
    reconciliation: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockLedger = { createEntry: jest.fn() };
  const mockTatumWallet = {
    mapCurrencyToChain: jest.fn(),
    mapCurrencyToV4Chain: jest.fn(),
  };
  const mockPlatformService = { getPlatformFeeWallet: jest.fn() };

  const mockTx = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumReconciliationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LedgerService, useValue: mockLedger },
        { provide: TatumWalletService, useValue: mockTatumWallet },
        { provide: TatumPlatformService, useValue: mockPlatformService },
      ],
    }).compile();

    service = module.get<TatumReconciliationService>(
      TatumReconciliationService,
    );

    jest.resetAllMocks();

    mockConfigService.get.mockImplementation((key: string, def?: string) => {
      if (key === 'TATUM_API_KEY') return 'test-api-key';
      if (key === 'RECONCILIATION_TOLERANCE') return '0.00000001';
      if (key === 'RECONCILIATION_AUTO_ADJUST') return 'true';
      return def;
    });
    mockPrismaService.$transaction.mockImplementation((cb) => cb(mockTx));
  });

  describe('reconcileAsset', () => {
    const ethAddress = '0x1111111111111111111111111111111111111111';
    const usdtAddress = '0x2222222222222222222222222222222222222222';

    it('reports IN_BALANCE when internal and on-chain balances match', async () => {
      mockPrismaService.wallet.aggregate.mockResolvedValue({
        _sum: {
          balance: new Decimal('100'),
          reservedBalance: new Decimal('0'),
        },
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', currency: Currency.ETH, address: ethAddress },
        { id: 'w2', currency: Currency.ETH, address: usdtAddress },
      ]);
      mockHttpService.get.mockReturnValue(of({ data: { balance: '50' } }));
      mockTatumWallet.mapCurrencyToV4Chain.mockReturnValue('ethereum-sepolia');
      mockPrismaService.reconciliation.create.mockResolvedValue({
        id: 'rec-uuid',
      });

      const result = await service.reconcileAsset(Currency.ETH, {
        applyAdjustment: false,
      });

      expect(result.status).toBe('IN_BALANCE');
      expect(result.difference).toBe('0');
      expect(mockLedger.createEntry).not.toHaveBeenCalled();
      expect(mockPrismaService.reconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: Currency.ETH,
            status: 'IN_BALANCE',
          }),
        }),
      );
    });

    it('adjusts the platform fee wallet when a discrepancy is detected and applyAdjustment is set', async () => {
      mockPrismaService.wallet.aggregate.mockResolvedValue({
        _sum: {
          balance: new Decimal('120'),
          reservedBalance: new Decimal('0'),
        },
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', currency: Currency.USDT, address: usdtAddress },
      ]);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            result: [
              { tokenAddress: STABLECOIN_CONTRACTS.USDT, balance: '100' },
            ],
          },
        }),
      );
      mockTatumWallet.mapCurrencyToV4Chain.mockReturnValue('ethereum-sepolia');
      mockPrismaService.reconciliation.create.mockResolvedValue({
        id: 'rec-uuid',
      });
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
        id: 'fee-wallet-uuid',
        address: ethAddress,
      });
      mockPrismaService.reconciliation.update.mockResolvedValue({
        id: 'rec-uuid',
        status: 'ADJUSTED',
      });

      const result = await service.reconcileAsset(Currency.USDT, {
        applyAdjustment: true,
      });

      expect(result.status).toBe('ADJUSTED');
      expect(mockLedger.createEntry).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          walletId: 'fee-wallet-uuid',
          amount: 20,
          type: LedgerType.RECONCILIATION_ADJUSTMENT,
          reference: `RECON-USDT-rec-uuid`,
        }),
      );
      expect(mockPrismaService.reconciliation.update).toHaveBeenCalledWith({
        where: { id: 'rec-uuid' },
        data: { status: 'ADJUSTED', reference: `RECON-USDT-rec-uuid` },
      });
    });

    it('reports DISCREPANCY without touching the ledger when adjustment is disabled', async () => {
      mockPrismaService.wallet.aggregate.mockResolvedValue({
        _sum: {
          balance: new Decimal('100'),
          reservedBalance: new Decimal('0'),
        },
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', currency: Currency.USDT, address: usdtAddress },
      ]);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            result: [
              { tokenAddress: STABLECOIN_CONTRACTS.USDT, balance: '90' },
            ],
          },
        }),
      );
      mockTatumWallet.mapCurrencyToV4Chain.mockReturnValue('ethereum-sepolia');
      mockPrismaService.reconciliation.create.mockResolvedValue({
        id: 'rec-uuid',
      });

      const result = await service.reconcileAsset(Currency.USDT, {
        applyAdjustment: false,
      });

      expect(result.status).toBe('DISCREPANCY');
      expect(mockLedger.createEntry).not.toHaveBeenCalled();
      expect(mockPrismaService.reconciliation.update).not.toHaveBeenCalled();
    });

    it('queries ERC-20 contract balances for stablecoins', async () => {
      mockPrismaService.wallet.aggregate.mockResolvedValue({
        _sum: { balance: new Decimal('10'), reservedBalance: new Decimal('0') },
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', currency: Currency.USDT, address: usdtAddress },
      ]);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            result: [
              { tokenAddress: STABLECOIN_CONTRACTS.USDT, balance: '10' },
            ],
          },
        }),
      );
      mockTatumWallet.mapCurrencyToV4Chain.mockReturnValue('ethereum-sepolia');
      mockPrismaService.reconciliation.create.mockResolvedValue({
        id: 'rec-uuid',
      });

      await service.reconcileAsset(Currency.USDT, { applyAdjustment: false });

      const url = mockHttpService.get.mock.calls[0][0];
      expect(url).toBe('https://api.tatum.io/v4/data/wallet/portfolio');
      expect(mockHttpService.get.mock.calls[0][1].params).toEqual(
        expect.objectContaining({
          chain: 'ethereum-sepolia',
          addresses: usdtAddress,
          tokenTypes: 'fungible',
        }),
      );
    });

    it('counts zero on-chain balance for wallets without an address', async () => {
      mockPrismaService.wallet.aggregate.mockResolvedValue({
        _sum: { balance: new Decimal('5'), reservedBalance: new Decimal('0') },
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', currency: Currency.BTC, address: null },
      ]);
      mockPrismaService.reconciliation.create.mockResolvedValue({
        id: 'rec-uuid',
      });

      const result = await service.reconcileAsset(Currency.BTC, {
        applyAdjustment: false,
      });

      expect(mockHttpService.get).not.toHaveBeenCalled();
      expect(result.onChainBalance).toBe('0');
    });
  });

  describe('reconcileAll', () => {
    it('runs every crypto currency and records failures', async () => {
      jest
        .spyOn(service, 'reconcileAsset')
        .mockResolvedValueOnce({
          currency: Currency.BTC,
          status: 'IN_BALANCE',
        } as any)
        .mockRejectedValueOnce(new Error('boom'));

      const result = await service.reconcileAll();

      expect(result.results).toHaveLength(4);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          currency: Currency.BTC,
          status: 'IN_BALANCE',
        }),
      );
      expect(result.results[1]).toEqual({
        currency: Currency.ETH,
        status: 'ERROR',
        error: 'boom',
      });
    });
  });
});
