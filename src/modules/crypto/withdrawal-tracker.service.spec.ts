/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency } from '@src/generated/client';

const BASE_JOB = {
  id: 'job-1',
  txHash: '0xtxhash',
  walletId: 'w-1',
  currency: Currency.USDT,
  amount: { toNumber: () => 5 },
  destination: '0xDest',
  attempts: 0,
  status: 'PENDING',
  metadata: {},
};

describe('WithdrawalTrackerService', () => {
  let service: WithdrawalTrackerService;
  let walletService: WalletService;

  const mockConfig = {
    isAlchemy: true,
    evmConfirmations: 12,
    btcConfirmations: 2,
  };

  const mockPrisma = {
    withdrawalJob: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      findUnique: jest.fn(),
    },
  };

  const mockWalletService = {
    updateTransactionStatus: jest.fn(),
  };

  const mockChainClient = {
    getEvmReceipt: jest.fn(),
    getLatestEvmBlock: jest.fn(),
    getBtcTipHeight: jest.fn(),
    getBtcTx: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalTrackerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: CryptoConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<WithdrawalTrackerService>(WithdrawalTrackerService);
    walletService = module.get<WalletService>(WalletService);
  });

  it('confirms a job once the EVM receipt has enough confirmations', async () => {
    mockPrisma.withdrawalJob.findMany.mockResolvedValue([BASE_JOB]);
    mockChainClient.getEvmReceipt.mockResolvedValue({
      blockNumber: 50,
      status: 1,
    });
    mockChainClient.getLatestEvmBlock.mockResolvedValue(62);
    mockPrisma.walletTransaction.findUnique.mockResolvedValue({
      id: 'wt-1',
      status: 'PENDING',
    });
    mockWalletService.updateTransactionStatus.mockResolvedValue({});

    await service.processQueue();

    expect(mockPrisma.withdrawalJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        status: 'CONFIRMED',
        metadata: expect.objectContaining({ confirmations: 13 }),
      },
    });
    expect(walletService.updateTransactionStatus).toHaveBeenCalledWith(
      'wt-1',
      'COMPLETED',
      expect.objectContaining({ confirmations: 13 }),
    );
  });

  it('marks a job FAILED when the EVM receipt reports a reverted status', async () => {
    mockPrisma.withdrawalJob.findMany.mockResolvedValue([BASE_JOB]);
    mockChainClient.getEvmReceipt.mockResolvedValue({
      blockNumber: 50,
      status: 0,
    });
    mockPrisma.walletTransaction.findUnique.mockResolvedValue({
      id: 'wt-1',
      status: 'PENDING',
    });
    mockWalletService.updateTransactionStatus.mockResolvedValue({});

    await service.processQueue();

    expect(mockPrisma.withdrawalJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'FAILED', metadata: expect.any(Object) },
    });
    expect(walletService.updateTransactionStatus).toHaveBeenCalledWith(
      'wt-1',
      'FAILED',
      expect.any(Object),
    );
  });

  it('backs off and keeps a job PENDING while the tx is unconfirmed', async () => {
    mockPrisma.withdrawalJob.findMany.mockResolvedValue([BASE_JOB]);
    mockChainClient.getEvmReceipt.mockResolvedValue(null);

    await service.processQueue();

    expect(mockPrisma.withdrawalJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        attempts: 1,
        nextPollAt: expect.any(Date),
      },
    });
    expect(mockWalletService.updateTransactionStatus).not.toHaveBeenCalled();
  });
});
