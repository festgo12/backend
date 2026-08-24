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
    alchemyBtcHttpUrl: 'https://btc-testnet.g.alchemy.com/v2/test',
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
    it('returns only confirmed utxos from Alchemy listunspent', async () => {
      (http.post as jest.Mock).mockReturnValue(
        of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: [
              {
                txid: 'aa',
                vout: 0,
                amount: 0.00001,
                confirmations: 10,
                blockheight: 100,
              },
              {
                txid: 'bb',
                vout: 0,
                amount: 0.00002,
                confirmations: 0,
              },
            ],
          },
        }),
      );

      const utxos = await service.getBtcUtxos('tb1abc');

      expect(utxos).toEqual([
        { txid: 'aa', vout: 0, value: 1000, blockHeight: 100 },
      ]);
    });
  });

  describe('getBtcTipHeight', () => {
    it('throws a descriptive error on RPC failure', async () => {
      (http.post as jest.Mock).mockReturnValue(
        of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            error: { code: -1, message: 'RPC error' },
          },
        }),
      );

      await expect(service.getBtcTipHeight()).rejects.toThrow(
        /Bitcoin RPC getblockcount failed/,
      );
    });

    it('throws a descriptive error for a non-numeric tip', async () => {
      (http.post as jest.Mock).mockReturnValue(
        of({
          data: { jsonrpc: '2.0', id: 1, result: 'oops' },
        }),
      );

      await expect(service.getBtcTipHeight()).rejects.toThrow(
        /non-numeric value/,
      );
    });
  });

  describe('getBtcTxStatus', () => {
    it('returns confirmed status with block height', async () => {
      (http.post as jest.Mock).mockReturnValue(
        of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: {
              confirmations: 3,
              blockheight: 200,
              blockhash: 'abc123',
            },
          },
        }),
      );

      const status = await service.getBtcTxStatus('txhash');
      expect(status).toEqual({ confirmed: true, blockHeight: 200 });
    });

    it('returns unconfirmed status for mempool tx', async () => {
      (http.post as jest.Mock).mockReturnValue(
        of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: { confirmations: 0 },
          },
        }),
      );

      const status = await service.getBtcTxStatus('txhash');
      expect(status).toEqual({ confirmed: false, blockHeight: null });
    });
  });

  describe('getAssetTransfers', () => {
    const TO = '0x2222222222222222222222222222222222222222';

    it('normalizes native + erc20 transfers with human units and decimal block numbers', async () => {
      const fakeProvider = {
        send: jest.fn().mockResolvedValue({
          transfers: [
            {
              category: 'external',
              from: '0x1111111111111111111111111111111111111111',
              to: TO,
              value: '123000000000000000',
              asset: 'ETH',
              hash: '0xh1',
              blockNum: '0x64',
            },
            {
              category: 'erc20',
              from: '0x1111111111111111111111111111111111111111',
              to: TO,
              value: '2500000',
              asset: 'USDT',
              hash: '0xh2',
              blockNum: '0x65',
              rawContract: { decimal: '6' },
            },
          ],
        }),
      };

      const transfers = await service.getAssetTransfers(fakeProvider, {
        fromBlock: 100,
        toBlock: 101,
        toAddresses: [TO],
        categories: ['external', 'erc20'],
      });

      expect(transfers).toHaveLength(2);
      expect(transfers[0]).toEqual(
        expect.objectContaining({
          category: 'external',
          amount: 0.123,
          blockNumber: 100,
          to: TO.toLowerCase(),
        }),
      );
      expect(transfers[1]).toEqual(
        expect.objectContaining({
          category: 'erc20',
          amount: 2.5,
          blockNumber: 101,
          asset: 'USDT',
        }),
      );
      expect(fakeProvider.send).toHaveBeenCalledWith(
        'alchemy_getAssetTransfers',
        [
          expect.objectContaining({
            fromBlock: '0x64',
            toBlock: '0x65',
            toAddress: [TO.toLowerCase()],
            maxCount: '0x3e8',
          }),
        ],
      );
    });

    it('falls back to per-address queries when the array query is rejected', async () => {
      const fakeProvider = {
        send: jest
          .fn()
          .mockRejectedValueOnce(new Error('array not supported'))
          .mockResolvedValueOnce({
            transfers: [
              {
                category: 'external',
                from: '0x1111111111111111111111111111111111111111',
                to: TO,
                value: '1000000000000000000',
                asset: 'ETH',
                hash: '0xhh',
                blockNum: '0x64',
              },
            ],
          }),
      };

      const transfers = await service.getAssetTransfers(fakeProvider, {
        fromBlock: 100,
        toBlock: 100,
        toAddresses: [TO, '0x3333333333333333333333333333333333333333'],
        categories: ['external'],
      });

      expect(transfers).toHaveLength(1);
      // 1 array query (rejected) + 2 per-address queries.
      expect(fakeProvider.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('broadcastBtc', () => {
    it('selects inputs, signs with the HD node and broadcasts via Alchemy RPC', async () => {
      (http.post as jest.Mock).mockImplementation((_url: string, body: { method: string }) => {
        if (body.method === 'sendrawtransaction') {
          return of({ data: { jsonrpc: '2.0', id: 1, result: 'deadbeef' } });
        }
        return of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: [
              {
                txid: 'cc'.repeat(32),
                vout: 0,
                amount: 0.001,
                confirmations: 10,
                blockheight: 100,
              },
            ],
          },
        });
      });

      const txid = await service.broadcastBtc(
        1000,
        'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
        0.0009,
        2,
      );

      expect(txid).toBe('deadbeef');
      const postCalls = (http.post as jest.Mock).mock.calls;
      const lastCall = postCalls[postCalls.length - 1] as unknown[];
      const body = lastCall[1] as {
        method: string;
        params: string[];
      };
      expect(body.method).toBe('sendrawtransaction');
      expect(typeof body.params[0]).toBe('string');
      expect(body.params[0].length).toBeGreaterThan(200);
    });

    it('throws when the confirmed balance is insufficient', async () => {
      (http.post as jest.Mock).mockImplementation((_url: string, body: { method: string }) => {
        if (body.method === 'sendrawtransaction') {
          return of({ data: { jsonrpc: '2.0', id: 1, result: 'deadbeef' } });
        }
        return of({
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: [
              {
                txid: 'cc'.repeat(32),
                vout: 0,
                amount: 0.00001,
                confirmations: 10,
                blockheight: 100,
              },
            ],
          },
        });
      });

      await expect(
        service.broadcastBtc(
          1000,
          'tb1qj0ruzthcv9s8kr55uuvcm73zj5zva3jh93swme',
          0.0005,
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
