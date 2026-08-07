import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { Currency } from '@src/generated/client';

const bip32 = BIP32Factory(ecc);
const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const TEST_NODE = bip32
  .fromSeed(bip39.mnemonicToSeedSync(TEST_MNEMONIC))
  .derivePath("m/84'/0'/0'/0")
  .derive(1000);
const TEST_ADDRESS = bitcoin.payments.p2wpkh({
  pubkey: TEST_NODE.publicKey,
  network: bitcoin.networks.testnet,
}).address!;

describe('ChainClientService', () => {
  let service: ChainClientService;
  let http: HttpService;

  const mockConfig = {
    isTestnet: true,
    alchemyEthHttpUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
    mempoolApiUrl: 'https://mempool.space/api',
    isAlchemy: true,
    getStablecoinContract: jest.fn(),
  };

  const mockHdWallet = {
    deriveAddress: jest.fn(),
    btcNode: jest.fn(),
    derivePrivateKey: jest.fn(),
    chainForCurrency: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockHdWallet.btcNode.mockReturnValue(TEST_NODE);
    mockHdWallet.deriveAddress.mockReturnValue(TEST_ADDRESS);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChainClientService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: CryptoConfigService, useValue: mockConfig },
        { provide: HdWalletService, useValue: mockHdWallet },
      ],
    }).compile();

    service = module.get<ChainClientService>(ChainClientService);
    http = module.get<HttpService>(HttpService);
  });

  describe('getBtcUtxos', () => {
    it('returns only confirmed utxos with heights', async () => {
      (http.get as jest.Mock).mockReturnValue(
        of({
          data: [
            {
              txid: 'aa',
              vout: 0,
              value: 1000,
              status: { confirmed: true, block_height: 10 },
            },
            { txid: 'bb', vout: 0, value: 2000, status: { confirmed: false } },
          ],
        }),
      );

      const utxos = await service.getBtcUtxos('tb1abc');

      expect(utxos).toEqual([
        { txid: 'aa', vout: 0, value: 1000, blockHeight: 10 },
      ]);
    });
  });

  describe('broadcastBtc', () => {
    it('selects inputs, signs with the HD node and broadcasts raw hex', async () => {
      (http.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/utxo')) {
          return of({
            data: [
              {
                txid: 'cc'.repeat(32),
                vout: 0,
                value: 100000,
                status: { confirmed: true, block_height: 100 },
              },
            ],
          });
        }
        if (url.includes('/v1/fees/recommended')) {
          return of({ data: { halfHourFee: 2 } });
        }
        throw new Error(`Unexpected GET ${url}`);
      });
      (http.post as jest.Mock).mockReturnValue(of({ data: 'deadbeef' }));

      const txid = await service.broadcastBtc(
        1000,
        'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
        0.0009,
        2,
      );

      expect(txid).toBe('deadbeef');
      const postedArgs = ((http.post as jest.Mock).mock.calls ?? []) as Array<
        Array<unknown>
      >;
      const postedHex = (postedArgs[0]?.[1] ?? '') as string;
      expect(typeof postedHex).toBe('string');
      expect(postedHex.length).toBeGreaterThan(200);
    });

    it('throws when the confirmed balance is insufficient', async () => {
      (http.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/utxo')) {
          return of({
            data: [
              {
                txid: 'cc'.repeat(32),
                vout: 0,
                value: 1000,
                status: { confirmed: true, block_height: 100 },
              },
            ],
          });
        }
        if (url.includes('/v1/fees/recommended')) {
          return of({ data: { halfHourFee: 2 } });
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await expect(
        service.broadcastBtc(
          1000,
          'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
          0.05,
          2,
        ),
      ).rejects.toThrow('Insufficient confirmed BTC balance');
    });
  });

  describe('getEvmBalance', () => {
    it('formats native ETH balance to human units', async () => {
      const fakeProvider = {
        getBalance: jest.fn().mockResolvedValue(123000000000000000n),
      };
      const testService = service as unknown as {
        providerInstance: { getBalance: jest.Mock };
      };
      testService.providerInstance = fakeProvider;

      const balance = await service.getEvmBalance('0xabc', Currency.ETH);

      expect(balance).toBe(0.123);
    });
  });
});
