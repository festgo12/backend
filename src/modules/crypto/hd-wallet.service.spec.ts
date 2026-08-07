/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { HdWalletService } from './hd-wallet.service';
import { CryptoConfigService } from './crypto-config.service';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency } from '@src/generated/client';
import { USER_INDEX_BASE, USER_INDEX_SPACE } from './hd-wallet.service';

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';

describe('HdWalletService', () => {
  let service: HdWalletService;

  const mockConfig = {
    isTestnet: true,
    evmMasterMnemonic: TEST_MNEMONIC,
    btcMasterMnemonic: TEST_MNEMONIC,
    evmDerivationPath: "m/44'/60'/0'/0",
    btcDerivationPath: "m/84'/0'/0'/0",
  };

  const mockPrisma = {
    wallet: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HdWalletService,
        { provide: CryptoConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HdWalletService>(HdWalletService);
  });

  describe('chainForCurrency', () => {
    it('maps EVM stablecoins and ETH to EVM', () => {
      expect(service.chainForCurrency(Currency.ETH)).toBe('EVM');
      expect(service.chainForCurrency(Currency.USDT)).toBe('EVM');
      expect(service.chainForCurrency(Currency.USDC)).toBe('EVM');
    });

    it('maps BTC to BTC and NGN to null', () => {
      expect(service.chainForCurrency(Currency.BTC)).toBe('BTC');
      expect(service.chainForCurrency(Currency.NGN)).toBeNull();
    });
  });

  describe('indexForUser', () => {
    it('produces a stable index within the reserved user space', () => {
      const a = service.indexForUser('user-1');
      const b = service.indexForUser('user-1');
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(USER_INDEX_BASE);
      expect(a).toBeLessThan(USER_INDEX_BASE + USER_INDEX_SPACE);
    });

    it('produces distinct indexes for distinct users', () => {
      expect(service.indexForUser('user-1')).not.toBe(
        service.indexForUser('user-2'),
      );
    });
  });

  describe('EVM derivation', () => {
    it('derives valid deterministic checksummed addresses', () => {
      const addr1 = service.deriveAddress(Currency.ETH, 1042);
      const addr2 = service.deriveAddress(Currency.ETH, 1042);
      expect(addr1).toBe(addr2);
      expect(addr1).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('derives distinct addresses for distinct indexes', () => {
      expect(service.deriveAddress(Currency.USDT, 1)).not.toBe(
        service.deriveAddress(Currency.USDT, 2),
      );
    });

    it('derives the same address for ETH, USDT and USDC at one index', () => {
      const eth = service.deriveAddress(Currency.ETH, 500);
      const usdt = service.deriveAddress(Currency.USDT, 500);
      const usdc = service.deriveAddress(Currency.USDC, 500);
      expect(usdt).toBe(eth);
      expect(usdc).toBe(eth);
    });

    it('derives a valid hex private key', () => {
      const key = service.derivePrivateKey(Currency.ETH, 1042);
      expect(key).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });
  });

  describe('BTC derivation', () => {
    it('derives valid deterministic native-segwit (bech32) addresses', () => {
      const addr1 = service.deriveAddress(Currency.BTC, 1042);
      const addr2 = service.deriveAddress(Currency.BTC, 1042);
      expect(addr1).toBe(addr2);
      expect(addr1).toMatch(/^tb1[a-zA-HJ-NP-Z0-9]{20,50}$/);
    });

    it('derives distinct addresses for distinct indexes', () => {
      expect(service.deriveAddress(Currency.BTC, 1)).not.toBe(
        service.deriveAddress(Currency.BTC, 2),
      );
    });

    it('derives a valid WIF private key', () => {
      const key = service.derivePrivateKey(Currency.BTC, 1042);
      expect(key).toMatch(/^[LKc][1-9A-HJ-NP-Za-km-z]{50,51}$/);
    });
  });

  describe('getMasterAddress', () => {
    it('returns the stable index-0 address per chain', () => {
      const evm = service.getMasterAddress('EVM');
      const btc = service.getMasterAddress('BTC');
      expect(evm).toBe(service.deriveAddress(Currency.ETH, 0));
      expect(btc).toBe(service.deriveAddress(Currency.BTC, 0));
    });
  });

  describe('getOrAssignDepositInfo', () => {
    it('reuses an existing on-chain address for the same chain', async () => {
      mockPrisma.wallet.findFirst.mockResolvedValue({
        address: '0xExistingEVMAddress0000000000000000000000',
        derivationIndex: 4242,
      });

      const info = await service.getOrAssignDepositInfo(
        'user-1',
        Currency.USDC,
      );

      expect(info).toEqual({
        chain: 'EVM',
        address: '0xExistingEVMAddress0000000000000000000000',
        derivationIndex: 4242,
      });
      expect(mockPrisma.wallet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            chain: 'EVM',
          }),
        }),
      );
    });

    it('derives and returns a fresh address when none exists', async () => {
      mockPrisma.wallet.findFirst.mockResolvedValue(null);
      const index = service.indexForUser('user-1');

      const info = await service.getOrAssignDepositInfo('user-1', Currency.ETH);

      expect(info.chain).toBe('EVM');
      expect(info.derivationIndex).toBe(index);
      expect(info.address).toBe(service.deriveAddress(Currency.ETH, index));
    });

    it('throws for fiat currencies', async () => {
      await expect(
        service.getOrAssignDepositInfo('user-1', Currency.NGN),
      ).rejects.toThrow('No on-chain deposit address');
    });
  });
});
