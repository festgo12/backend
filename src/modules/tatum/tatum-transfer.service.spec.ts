import { Test, TestingModule } from '@nestjs/testing';
import { TatumTransferService } from './tatum-transfer.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { TatumWalletService } from './tatum-wallet.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Currency, LedgerType } from '@src/generated/client';
import { of } from 'rxjs';

describe('TatumTransferService', () => {
  let service: TatumTransferService;

  const mockConfigService = { get: jest.fn() };
  const mockHttpService = { post: jest.fn() };
  const mockPrismaService = { walletTransaction: { create: jest.fn() } };
  const mockTatumWallet = {
    mapCurrencyToChain: jest.fn(),
    generatePrivateKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumTransferService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TatumWalletService, useValue: mockTatumWallet },
      ],
    }).compile();

    service = module.get<TatumTransferService>(TatumTransferService);

    jest.resetAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TATUM_API_KEY') return 'test-api-key';
      if (key === 'TATUM_BTC_MNEMONIC') return 'btc-mnemonic';
      if (key === 'TATUM_ETH_MNEMONIC') return 'eth-mnemonic';
      if (key === 'TATUM_USDT_MNEMONIC') return 'usdt-mnemonic';
      if (key === 'TATUM_USDC_MNEMONIC') return 'usdc-mnemonic';
      return undefined;
    });
  });

  describe('transfer', () => {
    const base = {
      asset: Currency.USDT,
      fromAddress: '0xFrom',
      fromIndex: 3,
      to: '0xTo111111111111111111111111111111111111',
      amount: '5',
    };

    it('throws BadRequestException when source address is missing', async () => {
      await expect(
        service.transfer({ ...base, fromAddress: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when destination is missing', async () => {
      await expect(service.transfer({ ...base, to: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('builds and broadcasts a BTC body from a derived private key', async () => {
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('bitcoin');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('btc-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'btc-tx' } }));

      const txId = await service.transfer({
        asset: Currency.BTC,
        fromAddress: 'bc1qfrom',
        fromIndex: 7,
        to: 'bc1qto',
        amount: '0.5',
      });

      const [url, body] = mockHttpService.post.mock.calls[0];
      expect(url).toBe('https://api.tatum.io/v3/bitcoin/transaction');
      expect(body).toEqual({
        fromAddress: [{ address: 'bc1qfrom', signatureId: 'btc-priv-key' }],
        to: [{ address: 'bc1qto', value: 0.5 }],
      });
      expect(mockTatumWallet.generatePrivateKey).toHaveBeenCalledWith(
        Currency.BTC,
        'btc-mnemonic',
        7,
      );
      expect(txId).toBe('btc-tx');
    });

    it('builds an ETH body without token fee', async () => {
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('eth-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'eth-tx' } }));

      const txId = await service.transfer({
        ...base,
        asset: Currency.ETH,
        to: '0xTo111111111111111111111111111111111111',
        amount: '1',
      });

      const [, body] = mockHttpService.post.mock.calls[0];
      expect(body).toEqual({
        to: '0xTo111111111111111111111111111111111111',
        currency: 'ETH',
        amount: '1',
        fromPrivateKey: 'eth-priv-key',
      });
      expect(txId).toBe('eth-tx');
    });

    it('builds a token-aware USDT body with gas fee', async () => {
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('usdt-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'usdt-tx' } }));

      const txId = await service.transfer(base);

      const [, body] = mockHttpService.post.mock.calls[0];
      expect(body).toEqual({
        to: base.to,
        currency: 'USDT',
        amount: '5',
        fromPrivateKey: 'usdt-priv-key',
        fee: { gasLimit: '100000', gasPrice: '20' },
      });
      expect(mockTatumWallet.generatePrivateKey).toHaveBeenCalledWith(
        Currency.USDT,
        'usdt-mnemonic',
        3,
      );
      expect(txId).toBe('usdt-tx');
    });

    it('builds a token-aware USDC body with gas fee', async () => {
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('usdc-priv-key');
      mockHttpService.post.mockReturnValue(of({ data: { txId: 'usdc-tx' } }));

      await service.transfer({ ...base, asset: Currency.USDC });

      const [, body] = mockHttpService.post.mock.calls[0];
      expect(body).toEqual(
        expect.objectContaining({
          currency: 'USDC',
          fee: { gasLimit: '100000', gasPrice: '20' },
        }),
      );
    });

    it('throws InternalServerErrorException when the mnemonic is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'TATUM_API_KEY' ? 'test-api-key' : undefined,
      );
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('bitcoin');

      await expect(
        service.transfer({
          ...base,
          asset: Currency.BTC,
          fromAddress: 'bc1qfrom',
          to: 'bc1qto',
        }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when no txId is returned', async () => {
      mockTatumWallet.mapCurrencyToChain.mockReturnValue('ethereum');
      mockTatumWallet.generatePrivateKey.mockResolvedValue('key');
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await expect(service.transfer(base)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('recordOnChainTransaction', () => {
    const base = {
      walletId: 'wallet-uuid',
      orderId: 'order-uuid',
      asset: Currency.USDT,
      txId: 'tx-abc',
      fromAddress: '0xFrom',
      to: '0xTo111111111111111111111111111111111111',
      amount: '5',
    };

    it('records a FEE entry for a fee leg', async () => {
      await service.recordOnChainTransaction({ ...base, type: 'fee' });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletId: 'wallet-uuid',
            type: LedgerType.FEE,
            amount: '5',
            status: 'PENDING',
            reference: 'tx-abc',
            metadata: expect.objectContaining({
              onChain: true,
              ledgerSettled: true,
              orderId: 'order-uuid',
              asset: Currency.USDT,
            }),
          }),
        }),
      );
    });

    it('records a TRADE_SETTLEMENT entry for a trade leg', async () => {
      await service.recordOnChainTransaction({ ...base, type: 'trade' });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LedgerType.TRADE_SETTLEMENT }),
        }),
      );
    });

    it('honours a custom FAILED status', async () => {
      await service.recordOnChainTransaction({
        ...base,
        type: 'trade',
        status: 'FAILED',
      });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });
  });
});
