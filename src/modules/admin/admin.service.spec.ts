/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoWithdrawalService } from '../crypto/crypto-withdrawal.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { CryptoConfigService } from '../crypto/crypto-config.service';
import { DepositAddressRegistry } from '../crypto/deposit-address-registry.service';
import { HdWalletService } from '../crypto/hd-wallet.service';
import { ChainClientService } from '../crypto/chain-client.service';
import { PaystackService } from '../paystack/paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { ReconciliationService } from '../crypto/reconciliation.service';
import { SweepService } from '../crypto/sweep.service';
import { Currency } from '@src/generated/client';
import { PLATFORM_EMAIL } from '../crypto/platform.service';
import { Decimal } from '@src/generated/client/runtime/library';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let cryptoWithdrawal: CryptoWithdrawalService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    wallet: { findMany: jest.fn(), findUnique: jest.fn() },
    walletTransaction: { findMany: jest.fn() },
    withdrawalJob: { findMany: jest.fn(), count: jest.fn() },
  };

  const mockCryptoWithdrawal = {
    sweepFeeWallet: jest.fn(),
    retryWithdrawal: jest.fn(),
  };
  const mockExchangeRateService = { getAllRates: jest.fn() };
  const mockCryptoConfig = {
    provider: 'alchemy',
    network: 'sepolia',
    isTestnet: true,
    evmConfirmations: 12,
    btcConfirmations: 2,
    depositSweepThreshold: 0,
  };
  const mockDepositRegistry = { size: 3 };
  const mockHdWallet = {
    getMasterAddress: jest.fn(),
  };
  const mockChainClient = {
    getBtcUtxos: jest.fn(),
    getEvmBalance: jest.fn(),
  };
  const mockPaystackService = {};
  const mockWalletService = {
    createTransaction: jest.fn(),
  };
  const mockReconciliationService = {
    reconcileAll: jest.fn(),
    reconcileCurrency: jest.fn(),
  };
  const mockSweepService = {
    manualSweepAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoWithdrawalService, useValue: mockCryptoWithdrawal },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        { provide: CryptoConfigService, useValue: mockCryptoConfig },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: HdWalletService, useValue: mockHdWallet },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ReconciliationService, useValue: mockReconciliationService },
        { provide: SweepService, useValue: mockSweepService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    cryptoWithdrawal = module.get<CryptoWithdrawalService>(
      CryptoWithdrawalService,
    );

    jest.resetAllMocks();
  });

  describe('getFeeWallets', () => {
    it('returns empty wallets when the platform user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getFeeWallets();

      expect(result).toEqual({ wallets: [], total: 0 });
    });

    it('maps fee wallet balances and ledger counts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'platform-user-uuid',
      });
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

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: PLATFORM_EMAIL },
      });
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
      await expect(service.sweepFeeWallet(Currency.USDT, '')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCryptoWithdrawal.sweepFeeWallet).not.toHaveBeenCalled();
    });

    it('rejects NGN sweeps since NGN is ledger-only', async () => {
      await expect(
        service.sweepFeeWallet(Currency.NGN, destination),
      ).rejects.toThrow('NGN fee revenue is held in the ledger');
      expect(mockCryptoWithdrawal.sweepFeeWallet).not.toHaveBeenCalled();
    });

    it('delegates to the local crypto withdrawal service', async () => {
      mockCryptoWithdrawal.sweepFeeWallet.mockResolvedValue({
        txId: 'sweep-tx',
        status: 'PENDING',
      });

      const result = await service.sweepFeeWallet(
        Currency.USDT,
        destination,
        25,
      );

      expect(cryptoWithdrawal.sweepFeeWallet).toHaveBeenCalledWith({
        currency: Currency.USDT,
        destinationAddress: destination,
        amount: 25,
      });
      expect(result).toEqual({ txId: 'sweep-tx', status: 'PENDING' });
    });
  });

  describe('getCryptoSystemStatus', () => {
    it('reports provider config, registry size and webhook providers', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        {
          id: 'sweep-1',
          currency: Currency.USDT,
          amount: new Decimal('1.5'),
          status: 'COMPLETED',
          reference: '0xtx',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
      mockHdWallet.getMasterAddress.mockReturnValue('0xMaster');

      const result = await service.getCryptoSystemStatus();

      expect(result.provider).toBe('alchemy');
      expect(result.network).toBe('sepolia');
      expect(result.isTestnet).toBe(true);
      expect(result.webhookProviders.evm).toBe('alchemy');
      expect(result.webhookProviders.btc).toBe('alchemy');
      expect(result.registrySize).toBe(3);
      expect(result.masterWallets.evm).toBe('0xMaster');
      expect(result.recentSweeps).toHaveLength(1);
    });
  });

  describe('getWithdrawalJobs', () => {
    it('returns paginated withdrawal jobs', async () => {
      mockPrismaService.withdrawalJob.findMany.mockResolvedValue([
        { id: 'job-1', status: 'PENDING' },
      ]);
      mockPrismaService.withdrawalJob.count.mockResolvedValue(1);

      const result = await service.getWithdrawalJobs(1, 20, 'PENDING');

      expect(mockPrismaService.withdrawalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.jobs).toEqual([{ id: 'job-1', status: 'PENDING' }]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getChainBalances', () => {
    it('aggregates master wallet balances across currencies', async () => {
      mockHdWallet.getMasterAddress
        .mockReturnValueOnce('0xEvmMaster')
        .mockReturnValueOnce('bc1btcmaster');
      mockChainClient.getBtcUtxos.mockResolvedValue([
        { txid: 'a', vout: 0, value: 5000, blockHeight: 1 },
      ]);
      mockChainClient.getEvmBalance.mockResolvedValue(2.5);

      const result = await service.getChainBalances();

      expect(result.balances).toEqual([
        { currency: Currency.BTC, address: 'bc1btcmaster', balance: 0.00005 },
        { currency: Currency.ETH, address: '0xEvmMaster', balance: 2.5 },
        { currency: Currency.USDT, address: '0xEvmMaster', balance: 2.5 },
        { currency: Currency.USDC, address: '0xEvmMaster', balance: 2.5 },
      ]);
    });
  });

  describe('creditTestFunds', () => {
    afterEach(() => {
      mockCryptoConfig.isTestnet = true;
    });

    it('throws ForbiddenException on a mainnet environment', async () => {
      mockCryptoConfig.isTestnet = false;

      await expect(
        service.creditTestFunds('user@example.com', Currency.USDT, 10),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWalletService.createTransaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when amount is not positive', async () => {
      await expect(
        service.creditTestFunds('user@example.com', Currency.USDT, 0),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.creditTestFunds('user@example.com', Currency.USDT, -5),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.creditTestFunds('ghost@example.com', Currency.USDT, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the user has no wallet for the currency', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'user@example.com',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.creditTestFunds('user@example.com', Currency.BTC, 0.1),
      ).rejects.toThrow(NotFoundException);
    });

    it('credits the wallet via the ledger on testnet', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'user@example.com',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-uuid',
        userId: 'user-uuid',
        currency: Currency.USDT,
      });
      mockWalletService.createTransaction.mockResolvedValue({
        id: 'tx-uuid',
        reference: 'testnet-credit-x',
        status: 'COMPLETED',
      });

      const result = (await service.creditTestFunds(
        'user@example.com',
        Currency.USDT,
        25,
      )) as { reference: string };

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'wallet-uuid',
          amount: 25,
          status: 'COMPLETED',
          metadata: expect.objectContaining({ testnet: true }) as object,
        }),
      );
      expect(result.reference).toBe('testnet-credit-x');
    });
  });
});
