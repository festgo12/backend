import { Test, TestingModule } from '@nestjs/testing';
import { BtcDepositPollerService } from './btc-deposit-poller.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

describe('BtcDepositPollerService', () => {
  let service: BtcDepositPollerService;

  const mockPrismaService = {
    walletTransaction: {
      findUnique: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
    },
  };

  const mockWalletService = {
    createTransaction: jest.fn(),
  };

  const mockDepositRegistry = {
    addressesForChain: jest.fn(),
    lookup: jest.fn(),
  };

  const mockChainClient = {
    getBtcTipHeight: jest.fn(),
    getBtcUtxos: jest.fn(),
  };

  const mockConfig = {
    isAlchemy: true,
    btcConfirmations: 2,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfig.isAlchemy = true;
    mockConfig.btcConfirmations = 2;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BtcDepositPollerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: DepositAddressRegistry, useValue: mockDepositRegistry },
        { provide: ChainClientService, useValue: mockChainClient },
        { provide: CryptoConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<BtcDepositPollerService>(BtcDepositPollerService);
  });

  describe('scan', () => {
    it('credits confirmed utxos into registered addresses only after the confirmation threshold', async () => {
      mockDepositRegistry.addressesForChain.mockReturnValue([
        'tb1qconfirmed',
        'tb1qunconfirmed',
      ]);
      mockChainClient.getBtcTipHeight.mockResolvedValue(110);
      mockChainClient.getBtcUtxos.mockImplementation((address: string) =>
        address === 'tb1qconfirmed'
          ? [
              {
                txid: 'aaa',
                vout: 0,
                value: 5000000,
                blockHeight: 108,
              },
            ]
          : [
              {
                txid: 'bbb',
                vout: 0,
                value: 7000000,
                blockHeight: 110,
              },
            ],
      );
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      mockDepositRegistry.lookup.mockReturnValue([
        { chain: 'BTC', walletId: 'wallet-1' },
      ]);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.BTC,
      });

      await service.scan();

      expect(mockWalletService.createTransaction).toHaveBeenCalledTimes(1);
      expect(mockWalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: 'wallet-1',
          type: LedgerType.DEPOSIT,
          amount: 0.05,
          reference: 'aaa',
          status: 'COMPLETED',
        }),
      );
      expect(mockWalletService.createTransaction).not.toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'bbb' }),
      );
    });

    it('is idempotent on the tx hash', async () => {
      mockDepositRegistry.addressesForChain.mockReturnValue(['tb1qconfirmed']);
      mockChainClient.getBtcTipHeight.mockResolvedValue(110);
      mockChainClient.getBtcUtxos.mockResolvedValue([
        { txid: 'aaa', vout: 0, value: 5000000, blockHeight: 108 },
      ]);
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'existing-tx',
      });

      await service.scan();

      expect(mockWalletService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('creditDeposit', () => {
    it('creates a COMPLETED transaction and skips on P2002', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      mockDepositRegistry.lookup.mockReturnValue([
        { chain: 'BTC', walletId: 'wallet-1' },
      ]);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        currency: Currency.BTC,
      });
      mockWalletService.createTransaction.mockRejectedValue({
        code: 'P2002',
      });

      await service.creditDeposit({
        address: 'tb1qconfirmed',
        currency: Currency.BTC,
        amount: 0.05,
        txHash: 'aaa',
        sourceAddress: null,
        confirmations: 3,
      });

      expect(mockWalletService.createTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
