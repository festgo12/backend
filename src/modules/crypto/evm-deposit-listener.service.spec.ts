/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EvmDepositListenerService } from './evm-deposit-listener.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

const USDT_CONTRACT = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const USDC_CONTRACT = '0x0000000000000000000000000000000000000001';

function padTo(value: string): string {
  return '0x' + value.slice(2).toLowerCase().padStart(64, '0');
}

describe('EvmDepositListenerService', () => {
  let service: EvmDepositListenerService;

  const mockPrismaService = {
    walletTransaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    wallet: {
      findUnique: jest.fn(),
    },
    chainCursor: {
      upsert: jest.fn(),
    },
  };

  const mockWalletService = {
    createTransaction: jest.fn(),
    updateTransactionStatus: jest.fn(),
  };

  const mockDepositRegistry = {
    rebuild: jest.fn().mockResolvedValue(undefined),
    addressesForChain: jest.fn(),
    lookup: jest.fn(),
    has: jest.fn(),
  };

  const mockChainClient = {
    getAssetTransfers: jest.fn(),
  };

  const mockConfig = {
    alchemyEthWsUrl: 'wss://eth-sepolia.g.alchemy.com/v2/test',
    evmConfirmations: 2,
    evmCatchUpMaxBlocks: 50,
    evmCatchUpMinIntervalMs: 60000,
    evmAssetTransferBatchBlocks: 5,
    evmAssetTransferBatchMaxMs: 30000,
    getStablecoinContract: jest.fn(),
  };

  const fakeProvider = {
    on: jest.fn(),
    getBlockNumber: jest.fn(),
    getBlock: jest.fn(),
    getLogs: jest.fn(),
    getTransactionReceipt: jest.fn(),
    destroy: jest.fn(),
    removeAllListeners: jest.fn(),
    destroyed: false,
    websocket: { onclose: null as any, onerror: null as any },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfig.alchemyEthWsUrl = 'wss://eth-sepolia.g.alchemy.com/v2/test';
    mockConfig.evmConfirmations = 2;
    mockConfig.evmCatchUpMaxBlocks = 50;
    mockConfig.evmCatchUpMinIntervalMs = 60000;
    mockConfig.evmAssetTransferBatchBlocks = 5;
    mockConfig.evmAssetTransferBatchMaxMs = 30000;
    mockConfig.getStablecoinContract.mockImplementation((currency: string) =>
      currency === 'USDT' ? USDT_CONTRACT : USDC_CONTRACT,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvmDepositListenerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: CryptoConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EvmDepositListenerService>(EvmDepositListenerService);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).provider = fakeProvider;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).lastCatchUpAt = 0;
  });

  describe('catchUp', () => {
    it('records ERC-20 transfers returned by getAssetTransfers as PENDING deposits', async () => {
      const to = '0x' + 'ab'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      mockChainClient.getAssetTransfers.mockResolvedValue([
        {
          category: 'erc20',
          from: '0x' + 'cd'.repeat(20),
          to,
          value: '1000000',
          amount: 1,
          asset: 'USDT',
          hash: '0xtx-usdt',
          blockNumber: 105,
        },
      ]);
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      mockDepositRegistry.lookup.mockReturnValue([
        { chain: 'EVM', walletId: 'wallet-1' },
      ]);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.USDT,
      });
      mockWalletService.createTransaction.mockResolvedValue({
        id: 'tx-row',
      });

      await service.catchUp();

      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledWith(
        fakeProvider,
        expect.objectContaining({ fromBlock: 101, toBlock: 109 }),
      );
      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          amount: 1,
          reference: '0xtx-usdt',
          status: 'PENDING',
        }),
      );
      expect(mockPrismaService.chainCursor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chain: 'EVM' },
          update: { lastBlock: 109 },
        }),
      );
    });

    it('records native ETH transfers returned by getAssetTransfers', async () => {
      const to = '0x' + 'ef'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      mockChainClient.getAssetTransfers.mockResolvedValue([
        {
          category: 'external',
          from: '0x0',
          to,
          value: '123000000000000000',
          amount: 0.123,
          asset: 'ETH',
          hash: '0xtx-eth',
          blockNumber: 108,
        },
      ]);
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      mockDepositRegistry.lookup.mockReturnValue([
        { chain: 'EVM', walletId: 'wallet-1' },
      ]);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.ETH,
      });
      mockWalletService.createTransaction.mockResolvedValue({
        id: 'tx-row',
      });

      await service.catchUp();

      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          amount: 0.123,
          reference: '0xtx-eth',
          status: 'PENDING',
        }),
      );
    });

    it('caps the scanned window to evmCatchUpMaxBlocks', async () => {
      const to = '0x' + 'cd'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(130);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 0,
        lastBlockHash: null,
      });
      mockChainClient.getAssetTransfers.mockResolvedValue([]);

      await service.catchUp();

      // cursor 0 -> from 1; maxFrom = 129; gap 129 > 50 -> from = 129-50+1 = 80.
      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledWith(
        fakeProvider,
        expect.objectContaining({ fromBlock: 80, toBlock: 129 }),
      );
    });

    it('throttles a redundant re-scan while the socket is up', async () => {
      const to = '0x' + 'cd'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).lastCatchUpAt = Date.now();

      await service.catchUp();

      expect(mockChainClient.getAssetTransfers).not.toHaveBeenCalled();
    });

    it('does not throttle a genuine gap after the socket was down', async () => {
      const to = '0x' + 'cd'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      mockChainClient.getAssetTransfers.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).socketDown = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).lastCatchUpAt = Date.now();

      await service.catchUp();

      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushBatch', () => {
    it('flushes a full batch with a single getAssetTransfers call and advances the cursor', async () => {
      const to = '0x' + 'ab'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlock.mockImplementation((b: number) =>
        Promise.resolve({
          hash: `0xhash${b}`,
          parentHash: b > 105 ? `0xhash${b - 1}` : '0xgenesis',
        }),
      );
      mockChainClient.getAssetTransfers.mockResolvedValue([]);
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({});

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).pendingBlocks = new Set([105, 106, 107, 108, 109]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).flushBatch();

      // maxFrom = 109 - 2 + 1 = 108.
      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledTimes(1);
      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledWith(
        fakeProvider,
        expect.objectContaining({ fromBlock: 105, toBlock: 109 }),
      );
      expect(mockPrismaService.chainCursor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { lastBlock: 108, lastBlockHash: '0xhash108' },
        }),
      );
    });

    it('resets the cursor on a re-org and does NOT run a full catch-up', async () => {
      const to = '0x' + 'ab'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlock.mockResolvedValue({
        hash: '0xhash109',
        parentHash: '0xnew108',
      });
      mockChainClient.getAssetTransfers.mockResolvedValue([]);
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({});

      // Force a boundary-hash mismatch (re-org below the confirmed boundary).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).cursorLastBlockHash = '0xold108';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).recentHashes = new Map([[108, '0xnew108']]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).pendingBlocks = new Set([109]);

      const catchUpSpy = jest.spyOn(service, 'catchUp');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).flushBatch();

      // rewindForReorg sets the cursor to maxFrom - 1 (108 - 1 = 107).
      expect(mockPrismaService.chainCursor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { lastBlock: 107, lastBlockHash: null },
        }),
      );
      // Affected span re-scanned on the new chain, no full catch-up.
      expect(mockChainClient.getAssetTransfers).toHaveBeenCalledWith(
        fakeProvider,
        expect.objectContaining({ fromBlock: 108, toBlock: 109 }),
      );
      expect(catchUpSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleTransferLog', () => {
    it('skips logs for unregistered addresses', async () => {
      mockDepositRegistry.has.mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).handleTransferLog(
        {
          removed: false,
          topics: [
            padTo('0xd'),
            padTo('0x' + 'cd'.repeat(20)),
            padTo('0x' + 'ab'.repeat(20)),
          ],
          data: '0x' + (1000000).toString(16).padStart(64, '0'),
          transactionHash: '0xtx',
          blockNumber: 105,
        },
        Currency.USDT,
      );

      expect(mockWalletService.createTransaction).not.toHaveBeenCalled();
    });

    it('records a PENDING deposit for a tracked address', async () => {
      const to = '0x' + 'ab'.repeat(20);
      mockDepositRegistry.has.mockReturnValue(true);
      mockDepositRegistry.lookup.mockReturnValue([
        { chain: 'EVM', walletId: 'wallet-1' },
      ]);
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.USDT,
      });
      mockWalletService.createTransaction.mockResolvedValue({
        id: 'tx-row',
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).handleTransferLog(
        {
          removed: false,
          topics: [padTo('0xd'), padTo('0x' + 'cd'.repeat(20)), padTo(to)],
          data: '0x' + (2500000).toString(16).padStart(64, '0'),
          transactionHash: '0xtx-live',
          blockNumber: 200,
        },
        Currency.USDT,
      );

      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2.5,
          reference: '0xtx-live',
          status: 'PENDING',
        }),
      );
    });

    it('cancels the PENDING deposit when a re-org emits a removed log', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'pending-1',
        status: 'PENDING',
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (service as any).handleTransferLog(
        {
          removed: true,
          topics: [
            padTo('0xd'),
            padTo('0x' + 'cd'.repeat(20)),
            padTo('0x' + 'ab'.repeat(20)),
          ],
          data: '0x0',
          transactionHash: '0xtx-removed',
          blockNumber: 105,
        },
        Currency.USDT,
      );

      expect(mockWalletService.updateTransactionStatus).toHaveBeenCalledWith(
        'pending-1',
        'CANCELLED',
        expect.objectContaining({ finalization: 'REORG_REMOVED_LOG' }),
      );
    });
  });

  describe('finalizePendingDeposits', () => {
    it('completes pending deposits whose block reached the confirmation depth and receipt exists', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        {
          id: 'pending-1',
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          status: 'PENDING',
          amount: { toNumber: () => 1 },
          reference: '0xtx-ok',
          metadata: { listener: 'EVM_WS', blockNumber: 100, asset: 'USDT' },
        },
        {
          id: 'pending-2',
          walletId: 'wallet-2',
          type: LedgerType.DEPOSIT,
          status: 'PENDING',
          amount: { toNumber: () => 2 },
          reference: '0xtx-stale',
          metadata: { listener: 'EVM_WS', blockNumber: 100, asset: 'USDT' },
        },
      ]);
      fakeProvider.getTransactionReceipt.mockImplementation((txHash: string) =>
        txHash === '0xtx-ok' ? { blockNumber: 100 } : null,
      );
      mockWalletService.updateTransactionStatus.mockResolvedValue({});

      await service.finalizePendingDeposits(102);

      expect(mockWalletService.updateTransactionStatus).toHaveBeenCalledTimes(
        1,
      );
      expect(mockWalletService.updateTransactionStatus).toHaveBeenCalledWith(
        'pending-1',
        'COMPLETED',
        expect.objectContaining({ confirmations: 3 }),
      );
    });

    it('cancels a pending whose receipt moved to a different block (re-org drop)', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        {
          id: 'pending-1',
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          status: 'PENDING',
          amount: { toNumber: () => 1 },
          reference: '0xtx-moved',
          metadata: { listener: 'EVM_WS', blockNumber: 100, asset: 'USDT' },
        },
      ]);
      fakeProvider.getTransactionReceipt.mockResolvedValue({
        blockNumber: 101,
      });
      mockWalletService.updateTransactionStatus.mockResolvedValue({});

      await service.finalizePendingDeposits(102);

      expect(mockWalletService.updateTransactionStatus).toHaveBeenCalledWith(
        'pending-1',
        'CANCELLED',
        expect.objectContaining({ finalization: 'REORG_DROPPED' }),
      );
    });

    it('cancels a pending with a missing receipt only after two consecutive misses', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        {
          id: 'pending-1',
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          status: 'PENDING',
          amount: { toNumber: () => 1 },
          reference: '0xtx-gone',
          metadata: { listener: 'EVM_WS', blockNumber: 100, asset: 'USDT' },
        },
      ]);
      fakeProvider.getTransactionReceipt.mockResolvedValue(null);
      mockWalletService.updateTransactionStatus.mockResolvedValue({});

      await service.finalizePendingDeposits(102);
      expect(mockWalletService.updateTransactionStatus).not.toHaveBeenCalled();

      await service.finalizePendingDeposits(102);
      expect(mockWalletService.updateTransactionStatus).toHaveBeenCalledWith(
        'pending-1',
        'CANCELLED',
        expect.objectContaining({ finalization: 'RECEIPT_MISSING' }),
      );
    });

    it('does no receipt lookups when there are no known PENDING deposits', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([]);

      await service.finalizePendingDeposits(102);

      expect(fakeProvider.getTransactionReceipt).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('reports connection state and pending deposit count', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).connected = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).lastConnectedAt = new Date('2026-01-01T00:00:00Z');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).depositsDetected = 4;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).catchUpRuns = 1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).latestBlock = 120;
      mockPrismaService.walletTransaction.count.mockResolvedValue(2);

      const status = await service.getStatus();

      expect(status).toEqual(
        expect.objectContaining({
          enabled: true,
          connected: true,
          depositsDetected: 4,
          catchUpRuns: 1,
          pendingCount: 2,
          latestBlock: 120,
        }),
      );
    });
  });
});
