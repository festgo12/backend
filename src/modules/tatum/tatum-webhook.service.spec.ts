import { Test, TestingModule } from '@nestjs/testing';
import { TatumWebhookService } from './tatum-webhook.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
import { of } from 'rxjs';
import { PLATFORM_EMAIL } from './tatum-platform.service';

describe('TatumWebhookService', () => {
  let service: TatumWebhookService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    wallet: { findUnique: jest.fn() },
    walletTransaction: { findUnique: jest.fn() },
  };

  const mockWalletService = {
    updateTransactionStatus: jest.fn(),
  };

  const mockTatumWallet = {};

  const webhookUrl = 'https://example.com/webhook';

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        const map: Record<string, string> = {
          TATUM_WEBHOOK_SECRET: 'secret',
          TATUM_API_KEY: 'api-key',
          TATUM_WEBHOOK_URL: webhookUrl,
          NODE_ENV: 'test',
        };
        return map[key] ?? defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TatumWebhookService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: TatumWalletService, useValue: mockTatumWallet },
      ],
    }).compile();

    service = module.get<TatumWebhookService>(TatumWebhookService);
  });

  describe('ensureOutgoingWebhooks', () => {
    it('registers outgoing subscriptions with the platform fee wallet address', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: 'sub-1' } }));
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockImplementation(
        ({
          where,
        }: {
          where: { userId_currency: { currency: Currency } };
        }) => ({
          id: 'fee-wallet',
          address:
            where.userId_currency.currency === Currency.BTC
              ? 'bc1FeeAddress'
              : '0xFeeAddress',
        }),
      );

      await service.ensureOutgoingWebhooks();

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: PLATFORM_EMAIL },
      });
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.tatum.io/v4/subscription',
        {
          type: 'OUTGOING_NATIVE_TX',
          attr: { chain: 'BTC', address: 'bc1FeeAddress', url: webhookUrl },
        },
        { headers: { 'x-api-key': 'api-key' } },
      );
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.tatum.io/v4/subscription',
        {
          type: 'OUTGOING_NATIVE_TX',
          attr: { chain: 'ETH', address: '0xFeeAddress', url: webhookUrl },
        },
        { headers: { 'x-api-key': 'api-key' } },
      );
    });

    it('skips chains when the platform fee wallet has no address yet', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'platform-user-uuid',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'fee-wallet',
        address: null,
      });

      await service.ensureOutgoingWebhooks();

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe('registerOutgoingSubscription', () => {
    it('includes the address in the outgoing subscription attr', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: 'sub-1' } }));

      const sub = await service.registerOutgoingSubscription(
        'ETH',
        '0xFeeAddress',
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.tatum.io/v4/subscription',
        expect.objectContaining({
          type: 'OUTGOING_NATIVE_TX',
          attr: expect.objectContaining({
            chain: 'ETH',
            address: '0xFeeAddress',
          }) as Record<string, unknown>,
        }),
        expect.anything(),
      );
      expect(sub?.type).toBe('OUTGOING_NATIVE_TX');
    });

    it('does not register the same chain and address twice', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: 'sub-1' } }));

      await service.registerOutgoingSubscription('ETH', '0xFeeAddress');
      await service.registerOutgoingSubscription('ETH', '0xFeeAddress');

      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });
  });
});
