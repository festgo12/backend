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
import { SanctionedAddressRepository } from '../security/crypto-risk.service';
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
    wallet: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
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
    confirmationsFor: (chain: string) =>
      chain === 'SOLANA' ? 32 : chain === 'TRON' ? 19 : 0,
    getStablecoinContractFor: jest.fn(),
    alchemySigningKey: 'global-signing-key',
    signingKeyForChain: jest.fn().mockReturnValue(null),
  };
  const mockDepositRegistry = { size: 3 };
  const mockHdWallet = {
    getMasterAddress: jest.fn(),
    getMasterAddressForChain: jest.fn(),
  };
  const mockChainClient = {
    getBtcUtxos: jest.fn(),
    getEvmBalance: jest.fn(),
    getSolanaTokenBalance: jest.fn(),
    getTronTokenBalance: jest.fn(),
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
  const mockSanctions = {
    getLastRefreshedAt: jest.fn().mockReturnValue(null),
    getCounts: jest.fn().mockReturnValue({ ethereum: 7, bitcoin: 2 }),
    refreshFromSource: jest.fn().mockResolvedValue({
      lastRefreshedAt: new Date('2026-01-01T00:00:00.000Z'),
      counts: { ethereum: 7, bitcoin: 2 },
      source: 'defaults',
      merged: { chainsBefore: { ethereum: 7, bitcoin: 2 }, chainsAfter: { ethereum: 7, bitcoin: 2 } },
    }),
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
        { provide: SanctionedAddressRepository, useValue: mockSanctions },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    cryptoWithdrawal = module.get<CryptoWithdrawalService>(
      CryptoWithdrawalService,
    );

    jest.resetAllMocks();

    // resetAllMocks clears module-scope implementations; re-seed the sanctions
    // repository mocks the crypto-status test relies on.
    mockSanctions.getLastRefreshedAt.mockReturnValue(null);
    mockSanctions.getCounts.mockReturnValue({ ethereum: 7, bitcoin: 2 });
    mockSanctions.refreshFromSource.mockResolvedValue({
      lastRefreshedAt: new Date('2026-01-01T00:00:00.000Z'),
      counts: { ethereum: 7, bitcoin: 2 },
      source: 'defaults',
      merged: {
        chainsBefore: { ethereum: 7, bitcoin: 2 },
        chainsAfter: { ethereum: 7, bitcoin: 2 },
      },
    });
    mockCryptoConfig.signingKeyForChain.mockReturnValue(null);
    mockCryptoConfig.alchemySigningKey = 'global-signing-key';
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
          chain: 'ETH',
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
          chain: 'ETH',
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
        chain: undefined,
      });
      expect(result).toEqual({ txId: 'sweep-tx', status: 'PENDING' });
    });
  });

  describe('triggerSweepAll', () => {
    it('delegates to the sweep service and returns the summary', async () => {
      mockSweepService.manualSweepAll.mockResolvedValue({
        evmSwept: 2,
        btcSwept: 1,
        solSwept: 0,
        tronSwept: 0,
        evmSkipped: 0,
        btcSkipped: 0,
        solSkipped: 0,
        tronSkipped: 0,
        sweptByChain: {},
        skippedByChain: {},
        errors: [],
      });

      const result = await service.triggerSweepAll();

      expect(mockSweepService.manualSweepAll).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Sweep completed',
        swept: 3,
        summary: {
          evmSwept: 2,
          btcSwept: 1,
          solSwept: 0,
          tronSwept: 0,
          evmSkipped: 0,
          btcSkipped: 0,
          solSkipped: 0,
          tronSkipped: 0,
          sweptByChain: {},
          skippedByChain: {},
          errors: [],
        },
      });
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
      mockHdWallet.getMasterAddressForChain.mockImplementation((chain: string) =>
        chain === 'SOLANA' ? 'SolMaster' : 'TronMaster',
      );

      const result = await service.getCryptoSystemStatus();

      expect(result.provider).toBe('alchemy');
      expect(result.network).toBe('sepolia');
      expect(result.isTestnet).toBe(true);
      expect(result.webhookProviders.evm).toBe('alchemy');
      expect(result.webhookProviders.btc).toBe('alchemy');
      expect(result.webhookProviders.tron).toBe('tron_poller');
      // Per-chain webhook signing keys fall back to the global key when the
      // per-chain key is unset — coverage must be visible either way.
      expect(result.webhookSigningCoverage).toEqual({
        ETH: { configured: true, keySource: 'global-fallback' },
        BSC: { configured: true, keySource: 'global-fallback' },
        POLYGON: { configured: true, keySource: 'global-fallback' },
        SOLANA: { configured: true, keySource: 'global-fallback' },
      });
      expect(result.confirmations.sol).toBe(32);
      expect(result.confirmations.tron).toBe(19);
      expect(result.registrySize).toBe(3);
      expect(result.sanctions).toEqual({
        lastRefreshedAt: null,
        counts: { ethereum: 7, bitcoin: 2 },
      });
      expect(result.masterWallets.evm).toBe('0xMaster');
      expect(result.masterWallets.sol).toBe('SolMaster');
      expect(result.masterWallets.tron).toBe('TronMaster');
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
    it('aggregates master wallet balances across every chain', async () => {
      mockHdWallet.getMasterAddress
        .mockReturnValueOnce('0xEvmMaster')
        .mockReturnValueOnce('bc1btcmaster');
      mockHdWallet.getMasterAddressForChain.mockImplementation((chain: string) =>
        chain === 'SOLANA' ? 'SolMaster' : 'TronMaster',
      );
      mockChainClient.getBtcUtxos.mockResolvedValue([
        { txid: 'a', vout: 0, value: 5000, blockHeight: 1 },
      ]);
      mockChainClient.getEvmBalance.mockResolvedValue(2.5);
      mockChainClient.getSolanaTokenBalance.mockResolvedValue(7);
      mockChainClient.getTronTokenBalance.mockResolvedValue(9);
      mockCryptoConfig.getStablecoinContractFor.mockReturnValue(
        '0xContractOrMint',
      );

      const result = await service.getChainBalances();

      expect(result.masterWallets).toEqual({
        evm: '0xEvmMaster',
        btc: 'bc1btcmaster',
        sol: 'SolMaster',
        tron: 'TronMaster',
      });
      expect(result.balances).toEqual([
        { chain: 'BTC', currency: Currency.BTC, address: 'bc1btcmaster', balance: 0.00005 },
        { chain: 'ETH', currency: Currency.ETH, address: '0xEvmMaster', balance: 2.5 },
        { chain: 'ETH', currency: Currency.USDT, address: '0xEvmMaster', balance: 2.5 },
        { chain: 'ETH', currency: Currency.USDC, address: '0xEvmMaster', balance: 2.5 },
        { chain: 'SOLANA', currency: Currency.USDT, address: 'SolMaster', balance: 7 },
        { chain: 'SOLANA', currency: Currency.USDC, address: 'SolMaster', balance: 7 },
        { chain: 'TRON', currency: Currency.USDT, address: 'TronMaster', balance: 9 },
        { chain: 'TRON', currency: Currency.USDC, address: 'TronMaster', balance: 9 },
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
      mockPrismaService.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.creditTestFunds('user@example.com', Currency.BTC, 0.1),
      ).rejects.toThrow(NotFoundException);
    });

    it('credits the wallet via the ledger on testnet', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'user@example.com',
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
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

    it('credits the chain-specific wallet when a chain is provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'user@example.com',
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'tron-wallet-uuid',
        userId: 'user-uuid',
        currency: Currency.USDT,
        chain: 'TRON',
      });
      mockWalletService.createTransaction.mockResolvedValue({
        id: 'tx-uuid',
        reference: 'testnet-credit-tron',
        status: 'COMPLETED',
      });

      await service.creditTestFunds(
        'user@example.com',
        Currency.USDT,
        10,
        'TRON',
      );

      expect(mockPrismaService.wallet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-uuid' }),
        }),
      );
      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ walletId: 'tron-wallet-uuid' }),
      );
    });
  });
});
