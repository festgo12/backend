/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@src/generated/client/runtime/library';
import { CryptoWithdrawalService } from './crypto-withdrawal.service';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainClientService } from './chain-client.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { HdWalletService } from './hd-wallet.service';
import { PlatformService } from './platform.service';
import { Currency, LedgerType } from '@src/generated/client';

describe('CryptoWithdrawalService', () => {
  let service: CryptoWithdrawalService;
  let chainClient: ChainClientService;
  let tracker: WithdrawalTrackerService;

  const mockPrisma = {
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockChainClient = {
    broadcastEvmNative: jest.fn(),
    broadcastEvmToken: jest.fn(),
    broadcastBtc: jest.fn(),
    getBtcRecommendedFee: jest.fn(),
    getEvmBalance: jest.fn(),
    getBtcUtxos: jest.fn(),
  };

  const mockTracker = { enqueue: jest.fn() };

  const mockHdWallet = {
    chainForCurrency: jest.fn().mockReturnValue('EVM'),
    getOrAssignDepositInfo: jest.fn(),
    getMasterAddress: jest.fn(),
  };

  const mockPlatformService = {
    getPlatformFeeWallet: jest.fn(),
    getPlatformUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // $transaction with interactive callback (ledger service style)
    mockPrisma.$transaction.mockImplementation(async (fns: unknown[]) => {
      if (Array.isArray(fns)) {
        // Sequential array of promises — execute each in order
        const results: unknown[] = [];
        for (const fn of fns) {
          if (typeof fn === 'function') {
            results.push(await fn(mockPrisma));
          } else {
            results.push(await fn);
          }
        }
        return results;
      }
      // Interactive transaction callback
      return (fns as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
    });

    // $executeRaw returns the number of affected rows (1 = success)
    mockPrisma.$executeRaw.mockResolvedValue(1);

    // Re-set mock implementations that resetAllMocks() clears
    mockHdWallet.chainForCurrency.mockReturnValue('EVM');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoWithdrawalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: WithdrawalTrackerService, useValue: mockTracker },
        { provide: HdWalletService, useValue: mockHdWallet },
        { provide: PlatformService, useValue: mockPlatformService },
      ],
    }).compile();

    service = module.get<CryptoWithdrawalService>(CryptoWithdrawalService);
    chainClient = module.get<ChainClientService>(ChainClientService);
    tracker = module.get<WithdrawalTrackerService>(WithdrawalTrackerService);
  });

  it('broadcasts ETH and enqueues a PENDING withdrawal job', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      balance: new Decimal('10'),
      reservedBalance: new Decimal('0'),
      address: '0xFrom',
      derivationIndex: 1042,
      currency: Currency.ETH,
      isFrozen: false,
    });
    mockPrisma.$executeRaw.mockResolvedValue(1);
    mockChainClient.broadcastEvmNative.mockResolvedValue('0xtxhash');
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: 'wt-1' });
    mockPrisma.walletTransaction.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    mockTracker.enqueue.mockResolvedValue({});

    const result = await service.processWithdrawal({
      walletId: 'w-1',
      amount: 2,
      destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      currency: Currency.ETH,
    });

    expect(chainClient.broadcastEvmNative).toHaveBeenCalledWith(
      0,
      '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      2,
    );
    expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'w-1',
          type: LedgerType.WITHDRAWAL,
          status: 'PENDING',
        }),
      }),
    );
    expect(tracker.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xtxhash',
        walletId: 'w-1',
        currency: Currency.ETH,
        destination: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      }),
    );
    expect(result).toEqual({ txId: '0xtxhash', status: 'PENDING' });
  });

  it('rejects withdrawals that exceed the available balance', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      balance: new Decimal('1'),
      reservedBalance: new Decimal('0'),
      address: '0xFrom',
      derivationIndex: 1042,
      currency: Currency.ETH,
      isFrozen: false,
    });
    // $executeRaw returns 0 → reservation failed → insufficient balance
    mockPrisma.$executeRaw.mockResolvedValue(0);

    await expect(
      service.processWithdrawal({
        walletId: 'w-1',
        amount: 2,
        destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
        currency: Currency.ETH,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('releases reservation and rethrows on broadcast failure', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      balance: new Decimal('10'),
      reservedBalance: new Decimal('0'),
      address: '0xFrom',
      derivationIndex: 1042,
      currency: Currency.ETH,
      isFrozen: false,
    });
    mockPrisma.$executeRaw.mockResolvedValue(1); // reservation succeeds
    mockChainClient.broadcastEvmNative.mockRejectedValue(
      new Error('gas estimation failed'),
    );

    await expect(
      service.processWithdrawal({
        walletId: 'w-1',
        amount: 2,
        destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
        currency: Currency.ETH,
      }),
    ).rejects.toThrow('Withdrawal failed: gas estimation failed');

    // Intent was created (pending)
    expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          metadata: expect.objectContaining({ intent: true }),
        }),
      }),
    );
    // Reservation was released
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(mockTracker.enqueue).not.toHaveBeenCalled();
  });

  it('rejects invalid destination addresses before reserving funds', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      id: 'w-1',
      balance: new Decimal('10'),
      reservedBalance: new Decimal('0'),
      address: 'tb1from',
      derivationIndex: 1042,
      currency: Currency.BTC,
      isFrozen: false,
    });

    await expect(
      service.processWithdrawal({
        walletId: 'w-1',
        amount: 0.001,
        destinationAddress: 'not-an-address',
        currency: Currency.BTC,
      }),
    ).rejects.toThrow('Invalid Bitcoin address format');
    // Should NOT have reserved any funds
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('sweeps a fee wallet and enqueues a FEE_WALLET_SWEEP job', async () => {
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'w-fee',
      address: '0xFrom',
      derivationIndex: 1042,
      currency: Currency.ETH,
    });
    mockChainClient.broadcastEvmNative.mockResolvedValue('0xsweephash');

    const result = await service.sweepFeeWallet({
      currency: Currency.ETH,
      destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      amount: 2,
    });

    expect(mockChainClient.broadcastEvmNative).toHaveBeenCalledWith(
      1042,
      '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      2,
    );
    expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'w-fee',
          type: LedgerType.WITHDRAWAL,
          status: 'PENDING',
          reference: '0xsweephash',
          metadata: expect.objectContaining({
            sweep: true,
            feeWallet: true,
            provider: 'alchemy',
          }),
        }),
      }),
    );
    expect(mockTracker.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xsweephash',
        walletId: 'w-fee',
        currency: Currency.ETH,
        metadata: { source: 'FEE_WALLET_SWEEP' },
      }),
    );
    expect(result).toEqual({ txId: '0xsweephash', status: 'PENDING' });
  });

  it('reassigns a legacy fee wallet address before sweeping', async () => {
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'w-fee-legacy',
      address: '0xLegacyFrom',
      derivationIndex: null,
      currency: Currency.ETH,
    });
    mockHdWallet.getMasterAddress.mockReturnValue('0xNewFrom');
    mockChainClient.broadcastEvmNative.mockResolvedValue('0xsweephash');

    await service.sweepFeeWallet({
      currency: Currency.ETH,
      destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      amount: 2,
    });

    expect(mockHdWallet.getMasterAddress).toHaveBeenCalledWith('EVM');
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
      where: { id: 'w-fee-legacy' },
      data: {
        address: '0xNewFrom',
        derivationIndex: 0,
        chain: 'EVM',
      },
    });
    expect(mockChainClient.broadcastEvmNative).toHaveBeenCalledWith(
      0,
      '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      2,
    );
  });

  it('rejects a fee wallet sweep when no on-chain balance is available', async () => {
    mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
      id: 'w-fee',
      address: '0xFrom',
      derivationIndex: 0,
      currency: Currency.ETH,
    });
    mockChainClient.getEvmBalance.mockResolvedValue(0);

    await expect(
      service.sweepFeeWallet({
        currency: Currency.ETH,
        destinationAddress: '0xabCDEF1234567890ABcDEF1234567890aBCDeF12',
      }),
    ).rejects.toThrow('No on-chain balance available');
  });
});
