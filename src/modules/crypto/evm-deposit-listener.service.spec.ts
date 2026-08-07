/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EvmDepositListenerService } from './evm-deposit-listener.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
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

  const mockConfig = {
    alchemyEthWsUrl: 'wss://eth-sepolia.g.alchemy.com/v2/test',
    evmConfirmations: 2,
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
    mockConfig.getStablecoinContract.mockImplementation((currency: string) =>
      currency === 'USDT' ? USDT_CONTRACT : USDC_CONTRACT,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvmDepositListenerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: CryptoConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EvmDepositListenerService>(EvmDepositListenerService);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).provider = fakeProvider;
  });

  describe('catchUp', () => {
    it('records ERC-20 transfers into registered addresses as PENDING deposits', async () => {
      const to = '0x' + 'ab'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      fakeProvider.getLogs.mockImplementation(
        ({ address }: { address: string }) => {
          if (address.toLowerCase() === USDT_CONTRACT.toLowerCase()) {
            return [
              {
                removed: false,
                topics: [
                  padTo('0xd'),
                  padTo('0x' + 'cd'.repeat(20)),
                  padTo(to),
                ],
                data: '0x' + (1000000).toString(16).padStart(64, '0'),
                transactionHash: '0xtx-usdt',
                blockNumber: 105,
              },
            ];
          }
          return [];
        },
      );
      fakeProvider.getBlock.mockResolvedValue({
        hash: '0xblockhash',
        prefetchedTransactions: [],
      });
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

      expect(fakeProvider.getLogs).toHaveBeenCalled();
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

    it('records native ETH transfers into registered addresses as PENDING deposits', async () => {
      const to = '0x' + 'ef'.repeat(20);
      mockDepositRegistry.addressesForChain.mockReturnValue([to]);
      fakeProvider.getBlockNumber.mockResolvedValue(110);
      mockPrismaService.chainCursor.upsert.mockResolvedValue({
        chain: 'EVM',
        lastBlock: 100,
        lastBlockHash: null,
      });
      fakeProvider.getLogs.mockResolvedValue([]);
      fakeProvider.getBlock.mockResolvedValue({
        hash: '0xblockhash',
        prefetchedTransactions: [
          { hash: '0xtx-eth', to, from: '0x0', value: 123000000000000000n },
        ],
      });
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
