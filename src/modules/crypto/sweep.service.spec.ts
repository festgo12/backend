/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { SweepService } from './sweep.service';
import { PrismaService } from '../../core/database/prisma.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { Currency, LedgerType } from '@src/generated/client';
import { LedgerService } from '../wallet/ledger.service';

describe('SweepService', () => {
  let service: SweepService;
  let chainClient: ChainClientService;

  const mockPrisma = {
    wallet: { findUnique: jest.fn(), findFirst: jest.fn() },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sweepConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockLedger = {
    createEntry: jest.fn(),
  };

  const mockDepositRegistry = {
    addressesForChain: jest.fn(),
    lookup: jest.fn(),
  };

  const mockChainClient = {
    getEvmBalance: jest.fn(),
    broadcastEvmNative: jest.fn(),
    broadcastEvmToken: jest.fn(),
    getBtcUtxos: jest.fn(),
    getBtcRecommendedFee: jest.fn(),
    broadcastBtc: jest.fn(),
    getSolanaTokenBalance: jest.fn(),
    broadcastSolanaToken: jest.fn(),
    getTronTokenBalance: jest.fn(),
    broadcastTronToken: jest.fn(),
    estimateTokenTransferGasCost: jest.fn(),
    getNativeGasBalance: jest.fn(),
  };

  const mockConfig = {
    depositSweepThreshold: 10,
    supportedChains: ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'],
    isEvmChain: (chain: string) =>
      chain === 'ETH' || chain === 'BSC' || chain === 'POLYGON',
    getStablecoinContractFor: jest.fn(),
  };

  const mockHdWallet = {
    getMasterAddress: jest.fn(),
    getMasterAddressForChain: jest.fn(),
  };

  const mockTracker = { enqueue: jest.fn() };

  const mockPlatformService = {
    getPlatformFeeWallet: jest.fn(),
  };

  const mockExchangeRate = {
    convertToUsd: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockHdWallet.getMasterAddress.mockReturnValue('0xMaster');
    mockHdWallet.getMasterAddressForChain.mockReturnValue('MasterChainAddr');
    mockExchangeRate.convertToUsd.mockReturnValue(50);
    // Default: gas pre-flight passes (estimate > 0, balance covers it).
    mockChainClient.estimateTokenTransferGasCost.mockResolvedValue(0.001);
    mockChainClient.getNativeGasBalance.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SweepService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: CryptoConfigService, useValue: mockConfig },
        { provide: HdWalletService, useValue: mockHdWallet },
        { provide: WithdrawalTrackerService, useValue: mockTracker },
        { provide: PlatformService, useValue: mockPlatformService },
        { provide: ExchangeRateService, useValue: mockExchangeRate },
        { provide: LedgerService, useValue: mockLedger },
      ],
    }).compile();

    service = module.get<SweepService>(SweepService);
    chainClient = module.get<ChainClientService>(ChainClientService);
  });

  it('skips the platform master wallet (index 0) during an EVM sweep', async () => {
    // The master address is registered as a deposit address by the fee wallet.
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'ETH' ? ['0xMaster'] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'fee-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'fee-wallet',
      currency: Currency.USDT,
      derivationIndex: 0,
    });

    const summary = await service.manualSweepAll();

    expect(summary).toEqual({
      evmSwept: 0,
      btcSwept: 0,
      solSwept: 0,
      tronSwept: 0,
      evmSkipped: 1,
      btcSkipped: 0,
      solSkipped: 0,
      tronSkipped: 0,
      errors: [],
      sweptByChain: {
        ETH: 0,
        BSC: 0,
        POLYGON: 0,
        SOLANA: 0,
        TRON: 0,
        BTC: 0,
      },
      skippedByChain: {
        ETH: 1,
        BSC: 0,
        POLYGON: 0,
        SOLANA: 0,
        TRON: 0,
        BTC: 0,
      },
    });
    expect(chainClient.broadcastEvmToken).not.toHaveBeenCalled();
  });

  it('sweeps a qualifying deposit address into the master wallet and marks the deposit as swept', async () => {
    const userAddress = '0xUserDeposit';
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'ETH' ? [userAddress] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(100);
    mockChainClient.broadcastEvmToken.mockResolvedValue('0xsweephash');
    mockPrisma.wallet.findFirst.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'platform-fee-wallet',
    });
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'sweep-tx' });
    mockPrisma.walletTransaction.findMany.mockResolvedValue([
      {
        id: 'deposit-tx',
        metadata: { address: userAddress },
      },
    ]);
    mockPrisma.walletTransaction.update.mockResolvedValue({});

    const summary = await service.manualSweepAll();

    expect(mockChainClient.broadcastEvmToken).toHaveBeenCalledWith(
      Currency.USDT,
      1000,
      '0xMaster',
      100,
      'ETH',
    );
    expect(mockTracker.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xsweephash',
        chain: 'ETH',
        metadata: { source: 'DEPOSIT_SWEEP' },
      }),
    );
    // Matched deposit marked swept and linked to the sweep tx.
    expect(mockPrisma.walletTransaction.update).toHaveBeenCalledWith({
      where: { id: 'deposit-tx' },
      data: {
        metadata: expect.objectContaining({
          swept: true,
          sweepTxHash: '0xsweephash',
        }),
      },
    });
    // A sweep writes a synchronous ledger entry at record time (not only via the
    // withdrawal-tracker finalization path).
    expect(mockLedger.createEntry).toHaveBeenCalledWith(mockPrisma, {
      walletId: 'platform-fee-wallet',
      transactionId: expect.any(String),
      amount: 100,
      type: LedgerType.DEPOSIT,
      reference: expect.stringMatching(/^0xsweephash-ledger$/),
      metadata: expect.objectContaining({
        sweep: true,
        fromAddress: userAddress,
        blockchain: 'ETH',
      }),
    });
    expect(summary).toEqual({
      evmSwept: 1,
      btcSwept: 0,
      solSwept: 0,
      tronSwept: 0,
      evmSkipped: 0,
      btcSkipped: 0,
      solSkipped: 0,
      tronSkipped: 0,
      errors: [],
      sweptByChain: {
        ETH: 1,
        BSC: 0,
        POLYGON: 0,
        SOLANA: 0,
        TRON: 0,
        BTC: 0,
      },
      skippedByChain: {
        ETH: 0,
        BSC: 0,
        POLYGON: 0,
        SOLANA: 0,
        TRON: 0,
        BTC: 0,
      },
    });
  });

  it('returns errors in the summary when a broadcast fails', async () => {
    const userAddress = '0xUserDeposit';
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'ETH' ? [userAddress] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.ETH,
      derivationIndex: 1000,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(100);
    mockChainClient.broadcastEvmNative.mockRejectedValue(
      new Error('nonce too low'),
    );

    const summary = await service.manualSweepAll();

    expect(summary.evmSwept).toBe(0);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain('nonce too low');
  });

  it('sweeps only the requested chain via manualSweepChain', async () => {
    const userAddress = '0xUserDeposit';
    mockDepositRegistry.addressesForChain.mockReturnValue([userAddress]);
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(100);
    mockChainClient.broadcastEvmToken.mockResolvedValue('0xsweephash');
    mockPrisma.wallet.findFirst.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'sweep-tx' });
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'platform-fee-wallet',
    });

    const summary = await service.manualSweepChain('ETH');

    expect(mockDepositRegistry.addressesForChain).toHaveBeenCalledTimes(1);
    expect(mockChainClient.broadcastEvmToken).toHaveBeenCalledTimes(1);
    expect(summary.evmSwept).toBe(1);
    expect(summary.sweptByChain).toEqual({ ETH: 1 });
    expect(summary.skippedByChain).toEqual({ ETH: 0 });
  });

  it('skips every address on a chain when sweeping is disabled by config', async () => {
    mockPrisma.sweepConfig.findUnique.mockResolvedValue({
      chain: 'TRON',
      enabled: false,
      thresholdUsd: null,
    });
    mockDepositRegistry.addressesForChain.mockReturnValue(['TUserAddress']);
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'TRON', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });

    const summary = await service.manualSweepChain('TRON');

    expect(summary.tronSwept).toBe(0);
    expect(summary.tronSkipped).toBe(1);
    expect(mockChainClient.broadcastEvmToken).not.toHaveBeenCalled();
  });

  it('honours a per-chain threshold override above the global default', async () => {
    mockPrisma.sweepConfig.findUnique.mockResolvedValue({
      chain: 'ETH',
      enabled: true,
      thresholdUsd: 100_000,
    });
    mockDepositRegistry.addressesForChain.mockReturnValue(['0xUserDeposit']);
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(100);
    // Global threshold is 10; the per-chain override (100k) should block the sweep.
    mockExchangeRate.convertToUsd.mockReturnValue(50);

    const summary = await service.manualSweepChain('ETH');

    expect(summary.evmSwept).toBe(0);
    expect(mockChainClient.broadcastEvmToken).not.toHaveBeenCalled();
  });

  it('upserts a sweep configuration via updateSweepConfig', async () => {
    mockPrisma.sweepConfig.upsert.mockResolvedValue({
      chain: 'SOLANA',
      enabled: false,
      thresholdUsd: null,
    });

    const result = await service.updateSweepConfig('SOLANA', {
      enabled: false,
      thresholdUsd: null,
    });

    expect(mockPrisma.sweepConfig.upsert).toHaveBeenCalledWith({
      where: { chain: 'SOLANA' },
      create: { chain: 'SOLANA', enabled: false, thresholdUsd: null },
      update: { enabled: false, thresholdUsd: null },
    });
    expect(result.enabled).toBe(false);
  });

  it('rejects an unsupported sweep chain in updateSweepConfig', async () => {
    await expect(
      service.updateSweepConfig('DOGE', { enabled: false }),
    ).rejects.toThrow(/Unsupported sweep chain/);
  });

  it('sweeps a qualifying SOLANA deposit address via broadcastSolanaToken', async () => {
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'SOLANA' ? ['SolUserDeposit'] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'SOLANA', walletId: 'sol-user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'sol-user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockConfig.getStablecoinContractFor.mockReturnValue('MintAddr');
    mockChainClient.getSolanaTokenBalance.mockResolvedValue(100);
    mockChainClient.broadcastSolanaToken.mockResolvedValue('sol-sig');
    mockPrisma.wallet.findFirst.mockResolvedValue({
      id: 'sol-user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'sweep-tx' });
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'platform-fee-wallet',
    });

    const summary = await service.manualSweepChain('SOLANA');

    expect(mockChainClient.broadcastSolanaToken).toHaveBeenCalledWith(
      Currency.USDT,
      1000,
      'MasterChainAddr',
      100,
    );
    expect(summary.solSwept).toBe(1);
    expect(summary.errors).toHaveLength(0);
  });

  it('skips a SOLANA sweep with a clear error when the source has no native SOL for gas', async () => {
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'SOLANA' ? ['SolUserDeposit'] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'SOLANA', walletId: 'sol-user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'sol-user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockConfig.getStablecoinContractFor.mockReturnValue('MintAddr');
    mockChainClient.getSolanaTokenBalance.mockResolvedValue(100);
    // Estimate needs gas but the address holds none.
    mockChainClient.estimateTokenTransferGasCost.mockResolvedValue(0.0021);
    mockChainClient.getNativeGasBalance.mockResolvedValue(0);

    const summary = await service.manualSweepChain('SOLANA');

    expect(mockChainClient.broadcastSolanaToken).not.toHaveBeenCalled();
    expect(summary.solSwept).toBe(0);
    expect(summary.solSkipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain('insufficient native gas');
  });

  it('skips a TRON sweep with a clear error when the source has no native TRX for energy', async () => {
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'TRON' ? ['TUserDeposit'] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'TRON', walletId: 'tron-user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'tron-user-wallet',
      currency: Currency.USDT,
      derivationIndex: 1000,
    });
    mockConfig.getStablecoinContractFor.mockReturnValue('TronContract');
    mockChainClient.getTronTokenBalance.mockResolvedValue(100);
    mockChainClient.estimateTokenTransferGasCost.mockResolvedValue(27.6);
    mockChainClient.getNativeGasBalance.mockResolvedValue(5);

    const summary = await service.manualSweepChain('TRON');

    expect(mockChainClient.broadcastTronToken).not.toHaveBeenCalled();
    expect(summary.tronSwept).toBe(0);
    expect(summary.tronSkipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain('insufficient native gas');
  });

  it('does not pre-flight gas for native ETH sweeps (gas is paid from the swept balance)', async () => {
    mockDepositRegistry.addressesForChain.mockImplementation((chain: string) =>
      chain === 'ETH' ? ['0xUserDeposit'] : [],
    );
    mockDepositRegistry.lookup.mockReturnValue([
      { chain: 'ETH', walletId: 'user-wallet' },
    ]);
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.ETH,
      derivationIndex: 1000,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(1);
    mockChainClient.broadcastEvmNative.mockResolvedValue('0xethsweep');
    mockPrisma.wallet.findFirst.mockResolvedValue({
      id: 'user-wallet',
      currency: Currency.ETH,
      derivationIndex: 1000,
    });
    mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'sweep-tx' });
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'platform-fee-wallet',
    });

    await service.manualSweepChain('ETH');

    expect(
      mockChainClient.estimateTokenTransferGasCost,
    ).not.toHaveBeenCalled();
    expect(mockChainClient.getNativeGasBalance).not.toHaveBeenCalled();
    expect(mockChainClient.broadcastEvmNative).toHaveBeenCalled();
  });
});
