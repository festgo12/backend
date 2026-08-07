import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  ContractTransactionResponse,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Currency } from '@src/generated/client';
import { CryptoConfigService, ChainKind } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

interface MempoolUtxo {
  txid: string;
  vout: number;
  value: number;
  status?: { confirmed?: boolean; block_height?: number };
}

interface MempoolTx {
  status?: { confirmed?: boolean; block_height?: number };
}

interface MempoolFees {
  halfHourFee?: number;
}

interface ErrorLike {
  message?: string;
  response?: { data?: { message?: string } };
}

export interface EvmReceipt {
  blockNumber: number;
  status: number | null;
}

export interface BtcUtxo {
  txid: string;
  vout: number;
  value: number;
  blockHeight: number;
}

export interface BtcTxStatus {
  confirmed: boolean;
  blockHeight: number | null;
  error?: string;
}

/**
 * Low-level chain access for the local-first (Alchemy) provider:
 *   - EVM: ethers JsonRpcProvider over the configured Alchemy HTTP URL.
 *     Deposits are detected with `alchemy_getAssetTransfers` (covers native
 *     ETH and ERC-20 in one call); transfers are broadcast with ethers.
 *   - BTC: mempool.space REST API for addresses/utxos/broadcast, with
 *     bitcoinjs-lib PSBT construction/signing from the HD wallet.
 * All keys derive from the HD master seed.
 */
@Injectable()
export class ChainClientService {
  private readonly logger = new Logger(ChainClientService.name);
  private providerInstance: JsonRpcProvider | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: CryptoConfigService,
    private readonly hdWallet: HdWalletService,
  ) {}

  get provider(): JsonRpcProvider {
    const url = this.config.alchemyEthHttpUrl;
    if (!url) {
      throw new InternalServerErrorException(
        'ALCHEMY_ETH_HTTP_URL is not configured',
      );
    }
    if (!this.providerInstance) {
      this.providerInstance = new JsonRpcProvider(url);
    }
    return this.providerInstance;
  }

  private get btcApiBase(): string {
    return this.config.isTestnet
      ? 'https://mempool.space/testnet/api'
      : this.config.mempoolApiUrl;
  }

  private get btcNetwork(): bitcoin.Network {
    return this.config.isTestnet
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
  }

  // --- EVM reads ---

  async getLatestEvmBlock(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getEvmBlockHash(blockNumber: number): Promise<string | null> {
    const block = await this.provider.getBlock(blockNumber);
    return block ? block.hash : null;
  }

  async getEvmReceipt(txHash: string): Promise<EvmReceipt | null> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return null;
    return { blockNumber: receipt.blockNumber, status: receipt.status };
  }

  /** Human-unit balance for a currency at an EVM address (native or ERC-20). */
  async getEvmBalance(address: string, currency: Currency): Promise<number> {
    if (currency === Currency.ETH) {
      return Number(formatEther(await this.provider.getBalance(address)));
    }
    const contract = this.config.getStablecoinContract(currency);
    if (!contract) return 0;
    const token = new Contract(contract, ERC20_ABI, this.provider);
    const raw = (await token.balanceOf(address)) as bigint;
    return Number(formatUnits(raw, this.decimalsFor(currency)));
  }

  // --- BTC reads ---

  async getBtcTipHeight(): Promise<number> {
    const res = await lastValueFrom(
      this.httpService.get(`${this.btcApiBase}/blocks/tip/height`),
    );
    return Number(res.data);
  }

  /** Confirmed utxos for a bech32/legacy address. */
  async getBtcUtxos(address: string): Promise<BtcUtxo[]> {
    const res = await lastValueFrom(
      this.httpService.get(`${this.btcApiBase}/address/${address}/utxo`),
    );
    const utxos = (Array.isArray(res.data) ? res.data : []) as MempoolUtxo[];
    return utxos
      .filter((u) => u.status?.confirmed)
      .map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: Number(u.value),
        blockHeight: Number(u.status?.block_height),
      }));
  }

  async getBtcTx(txid: string): Promise<BtcTxStatus> {
    try {
      const res = await lastValueFrom(
        this.httpService.get(`${this.btcApiBase}/tx/${txid}`),
      );
      const data = (res.data || {}) as MempoolTx;
      return {
        confirmed: Boolean(data.status?.confirmed),
        blockHeight: data.status?.block_height ?? null,
      };
    } catch (error) {
      const err = error as ErrorLike;
      return {
        confirmed: false,
        blockHeight: null,
        error: err.response?.data?.message || err.message,
      };
    }
  }

  async getBtcRecommendedFee(): Promise<number> {
    try {
      const res = await lastValueFrom(
        this.httpService.get(`${this.btcApiBase}/v1/fees/recommended`),
      );
      const fees = res.data as MempoolFees;
      const satPerVb = Number(fees.halfHourFee);
      return satPerVb > 0 ? satPerVb : 2;
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.warn(
        `BTC fee estimate failed (${err.message}); using 2 sat/vB`,
      );
      return 2;
    }
  }

  // --- EVM broadcast ---

  async broadcastEvmNative(
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    const signer = this.evmSigner(fromIndex);
    const tx = await signer.sendTransaction({
      to,
      value: parseEther(Number(amount).toFixed(18)),
    });
    this.logger.log(`ETH broadcast: ${amount} ${to} (TX: ${tx.hash})`);
    return tx.hash;
  }

  async broadcastEvmToken(
    currency: Currency,
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    const contract = this.config.getStablecoinContract(currency);
    if (!contract) {
      throw new InternalServerErrorException(
        `No ${currency} contract configured for the active network`,
      );
    }
    const decimals = this.decimalsFor(currency);
    const signer = this.evmSigner(fromIndex);
    const token = new Contract(contract, ERC20_ABI, signer);
    const tx = (await token.transfer(
      to,
      parseUnits(Number(amount).toFixed(decimals), decimals),
    )) as ContractTransactionResponse;
    this.logger.log(`${currency} broadcast: ${amount} ${to} (TX: ${tx.hash})`);
    return tx.hash;
  }

  // --- BTC broadcast ---

  /**
   * Broadcasts a native BTC payment from the derived index to `to`. Performs
   * simple descending coin selection over confirmed utxos; change returns to
   * the source address. Returns the txid.
   */
  async broadcastBtc(
    fromIndex: number,
    to: string,
    amountBtc: number,
    feePerByte: number,
  ): Promise<string> {
    const valueSat = Math.floor(amountBtc * 1e8);
    const fromAddress = this.hdWallet.deriveAddress(Currency.BTC, fromIndex);
    const node = this.hdWallet.btcNode(fromIndex);
    const utxos = await this.getBtcUtxos(fromAddress);

    const selected: BtcUtxo[] = [];
    let total = 0;
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    for (const u of sorted) {
      selected.push(u);
      total += u.value;
      const fee = this.estimateBtcFee(selected.length, 2, feePerByte);
      if (total >= valueSat + fee) break;
    }

    const fee = this.estimateBtcFee(selected.length, 2, feePerByte);
    if (selected.length === 0 || total < valueSat + fee) {
      throw new InternalServerErrorException(
        'Insufficient confirmed BTC balance (including network fee)',
      );
    }

    const change = total - valueSat - fee;
    const psbt = new bitcoin.Psbt({ network: this.btcNetwork });
    const spendScript = bitcoin.payments.p2wpkh({
      pubkey: node.publicKey,
      network: this.btcNetwork,
    }).output;
    if (!spendScript) {
      throw new InternalServerErrorException(
        'Failed to build BTC spend script',
      );
    }

    for (const u of selected) {
      psbt.addInput({
        hash: Buffer.from(u.txid, 'hex'),
        index: u.vout,
        witnessUtxo: { script: spendScript, value: BigInt(u.value) },
      });
    }
    psbt.addOutput({ address: to, value: BigInt(valueSat) });
    if (change >= 546) {
      psbt.addOutput({ address: fromAddress, value: BigInt(change) });
    }

    for (let i = 0; i < selected.length; i++) {
      psbt.signInput(i, node);
    }
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const rawHex = tx.toHex();

    const res = await lastValueFrom(
      this.httpService.post(`${this.btcApiBase}/tx`, rawHex, {
        headers: { 'content-type': 'text/plain' },
      }),
    );
    const txid = String(res.data).trim();
    this.logger.log(`BTC broadcast: ${amountBtc} ${to} (TX: ${txid})`);
    return txid;
  }

  // --- helpers ---

  private evmSigner(fromIndex: number): Wallet {
    const pk = this.hdWallet.derivePrivateKey(Currency.ETH, fromIndex);
    return new Wallet(pk, this.provider);
  }

  private decimalsFor(currency: Currency): number {
    return currency === Currency.ETH ? 18 : 6;
  }

  private estimateBtcFee(
    inputs: number,
    outputs: number,
    feePerByte: number,
  ): number {
    const size = 10 + 68 * inputs + 31 * outputs;
    return Math.max(1, Math.round(size * feePerByte));
  }

  /** Currency-safe chain kind (re-export for consumers). */
  chainKind(currency: Currency): ChainKind | null {
    return this.hdWallet.chainForCurrency(currency);
  }
}
