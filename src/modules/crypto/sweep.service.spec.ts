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
import { Currency } from '@src/generated/client';

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
  };

  const mockConfig = {
    depositSweepThreshold: 10,
    supportedChains: ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'],
    isEvmChain: (chain: string) =>
      chain === 'ETH' || chain === 'BSC' || chain === 'POLYGON',
  };

  const mockHdWallet = {
    getMasterAddress: jest.fn(),
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
    mockExchangeRate.convertToUsd.mockReturnValue(50);

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
});
