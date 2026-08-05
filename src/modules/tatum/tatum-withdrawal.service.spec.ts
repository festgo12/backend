import { Test, TestingModule } from '@nestjs/testing';
import { TatumWithdrawalService } from './tatum-withdrawal.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumPlatformService } from './tatum-platform.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Currency, LedgerType } from '@src/generated/client';
import { Decimal } from '@src/generated/client/runtime/library';
import { of } from 'rxjs';

describe('TatumWithdrawalService', () => {
  let service: TatumWithdrawalService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockPrismaService = {
    wallet: { findUnique: jest.fn() },
    walletTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockWalletService = {
    updateTransactionStatus: jest.fn(),
  };

  const mockTatumWallet = {
    getAddressIndex: jest.fn(),
    mapCurrencyToChain: jest.fn(),
    generatePrivateKey: jest.fn(),
    generateAddress: jest.fn(),
  };

  const mockPlatformService = {
    getPlatformFeeWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumWithdrawalService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: TatumWalletService, useValue: mockTatumWallet },
        { provide: TatumPlatformService, useValue: mockPlatformService },
      ],
    }).compile();

    service = module.get<TatumWithdrawalService>(TatumWithdrawalService);

    jest.resetAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TATUM_API_KEY') return 'test-api-key';
      if (key === 'TATUM_USDT_MNEMONIC') return 'test-mnemonic';
      if (key === 'TATUM_ETH_MNEMONIC') return 'test-mnemonic';
      if (key === 'TATUM_BTC_MNEMONIC') return 'test-mnemonic';
      return undefined;
    });
  });

  describe('processWithdrawal', () => {
    const wallet = {
      id: 'wallet-uuid',
      userId: 'user-uuid',
      currency: Currency.USDT,
      address: '0xUserDerivedAddress123456789012345678901234',
      balance: new Decimal('100'),
      reservedBalance: new Decimal('10'),
    };

    const params = {
      walletId: 'wallet-uuid',
      amount: 50,
      destinationAddress: '0x1111111111111111111111111111111111111111',
      currency: Currency.USDT,
    };

    it('sources the withdrawal from the user own derived address', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockTatumWallet.getAddressIndex.mockReturnValue(424242);
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue(
        'derived-private-key',
      );
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'tx-abc' } }));
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'wt-uuid',
      });

      const result = await service.processWithdrawal(params);

      expect(result).toEqual({ txId: 'tx-abc', status: 'PENDING' });
      expect(mockTatumWallet.getAddressIndex).toHaveBeenCalledWith(
        'wallet-uuid',
      );
      expect(mockTatumWallet.generatePrivateKey).toHaveBeenCalledWith(
        Currency.USDT,
        'test-mnemonic',
        424242,
      );

      const [url, body] = mockHttpService.post.mock.calls[0];
      expect(url).toBe('https://api.tatum.io/v3/ethereum/transaction');
      expect(body).toMatchObject({
        to: params.destinationAddress,
        currency: 'USDT',
        amount: '50',
        fromPrivateKey: 'derived-private-key',
        fee: { gasLimit: '100000', gasPrice: '20' },
      });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletId: 'wallet-uuid',
            type: LedgerType.WITHDRAWAL,
            amount: 50,
            status: 'PENDING',
            reference: 'tx-abc',
            metadata: expect.objectContaining({
              destination: params.destinationAddress,
            }),
          }),
        }),
      );
    });

    it('throws BadRequestException when wallet is not found', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.processWithdrawal(params)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when available balance is insufficient', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        ...wallet,
        balance: new Decimal('5'),
        reservedBalance: new Decimal('2'),
      });

      await expect(service.processWithdrawal(params)).rejects.toThrow(
        'Insufficient balance',
      );
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when wallet has no on-chain address', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        ...wallet,
        address: null,
      });

      await expect(service.processWithdrawal(params)).rejects.toThrow(
        'no on-chain address',
      );
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an invalid destination address', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);

      await expect(
        service.processWithdrawal({
          ...params,
          destinationAddress: 'not-an-address',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('builds a BTC body from the user own derived address', async () => {
      const btcWallet = {
        ...wallet,
        currency: Currency.BTC,
        address: 'bc1quserderivedaddress1234567890',
      };
      mockPrismaService.wallet.findUnique.mockResolvedValue(btcWallet);
      mockTatumWallet.getAddressIndex.mockReturnValue(7);
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('bitcoin');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('btc-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'btc-tx' } }));
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'wt-uuid',
      });

      await service.processWithdrawal({
        walletId: 'wallet-uuid',
        amount: 0.5,
        destinationAddress: 'bc1qdestination12345678901234567890',
        currency: Currency.BTC,
      });

      const [, body] = mockHttpService.post.mock.calls[0];
      expect(body).toEqual({
        fromAddress: [
          { address: btcWallet.address, signatureId: 'btc-priv-key' },
        ],
        to: [{ address: 'bc1qdestination12345678901234567890', value: 0.5 }],
      });
      expect(mockTatumWallet.generatePrivateKey).toHaveBeenCalledWith(
        Currency.BTC,
        'test-mnemonic',
        7,
      );
    });

    it('records a FAILED transaction and throws when no txId is returned', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('key');
      mockHttpService.post.mockReturnValue(of({ data: {} }));
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'failed-uuid',
      });

      await expect(service.processWithdrawal(params)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            metadata: expect.objectContaining({
              destination: params.destinationAddress,
              blockchain: 'ethereum',
              lastError: 'No txId returned from Tatum',
            }),
          }),
        }),
      );
    });
  });

  describe('sweepFeeWallet', () => {
    it('sweeps the fee wallet from its own derived address', async () => {
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
        id: 'fee-wallet-uuid',
        address: '0xFeeWalletAddress123456789012345678901234',
      });
      mockTatumWallet.getAddressIndex.mockReturnValue(55);
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('fee-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'sweep-tx' } }));
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'wt-uuid',
      });

      const result = await service.sweepFeeWallet({
        currency: Currency.USDT,
        destinationAddress: '0x2222222222222222222222222222222222222222',
        amount: 25,
      });

      expect(result).toEqual({ txId: 'sweep-tx', status: 'PENDING' });
      expect(mockTatumWallet.generatePrivateKey).toHaveBeenCalledWith(
        Currency.USDT,
        'test-mnemonic',
        900000 + 55,
      );

      const [, body] = mockHttpService.post.mock.calls[0];
      expect(body).toMatchObject({
        to: '0x2222222222222222222222222222222222222222',
        fromPrivateKey: 'fee-priv-key',
        amount: '25',
      });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletId: 'fee-wallet-uuid',
            status: 'PENDING',
            metadata: expect.objectContaining({ sweep: true, feeWallet: true }),
          }),
        }),
      );
    });

    it('throws when amount is not positive', async () => {
      await expect(
        service.sweepFeeWallet({
          currency: Currency.USDT,
          destinationAddress: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Amount must be greater than 0');
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('throws when the fee wallet is missing', async () => {
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue(null);

      await expect(
        service.sweepFeeWallet({
          currency: Currency.ETH,
          destinationAddress: '0x1234567890123456789012345678901234567890',
          amount: 1,
        }),
      ).rejects.toThrow('Fee wallet not found');
    });

    it('throws when the fee wallet has no on-chain address', async () => {
      mockPlatformService.getPlatformFeeWallet.mockResolvedValue({
        id: 'fee-wallet-uuid',
        address: null,
      });

      await expect(
        service.sweepFeeWallet({
          currency: Currency.USDT,
          destinationAddress: '0x1234567890123456789012345678901234567890',
          amount: 1,
        }),
      ).rejects.toThrow('no on-chain address');
    });
  });

  describe('retryWithdrawal', () => {
    it('re-processes a previously failed withdrawal', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'failed-uuid',
        walletId: 'wallet-uuid',
        amount: new Decimal('10'),
        status: 'FAILED',
        metadata: { destination: '0x1111111111111111111111111111111111111111' },
        wallet: { currency: Currency.ETH },
      });
      mockPrismaService.walletTransaction.delete.mockResolvedValue({});
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-uuid',
        address: '0xUserDerivedAddress123456789012345678901234',
        balance: new Decimal('100'),
        reservedBalance: new Decimal('0'),
      });
      mockTatumWallet.getAddressIndex.mockReturnValue(1);
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'retry-tx' } }));
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'wt-uuid',
      });

      const result = await service.retryWithdrawal('failed-uuid');

      expect(result).toEqual({ txId: 'retry-tx', status: 'PENDING' });
      expect(mockPrismaService.walletTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'failed-uuid' },
      });
    });

    it('throws when transaction is not in FAILED status', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 'x',
        status: 'PENDING',
      });

      await expect(service.retryWithdrawal('x')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
