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
import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { TronWeb } from 'tronweb';
import * as bitcoin from 'bitcoinjs-lib';

/** Minimal typed contract surface used for read-only TRC-20 calls. */
type TronWebContract = {
  balanceOf(address: string): { call(): Promise<{ toString(): string }> };
  symbol(): { call(): Promise<{ toString(): string }> };
  decimals(): { call(): Promise<{ toString(): string }> };
};
import { Currency } from '@src/generated/client';
import {
  ChainFamily,
  Chain,
  CryptoConfigService,
  ChainKind,
} from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface ErrorLike {
  message?: string;
  code?: string;
  response?: { status?: number; data?: unknown };
}

export interface EvmReceipt {
  blockNumber: number;
  status: number | null;
}

export interface EvmAssetTransfer {
  category: string;
  from: string;
  to: string;
  value: string;
  amount: number;
  asset: string;
  hash: string;
  blockNumber: number;
}

export interface AssetTransfersParams {
  fromBlock: number;
  toBlock: number;
  toAddresses: string[];
  categories?: ('external' | 'erc20')[];
}

/** Minimal structural view of an RPC transport with a raw `send` method. */
export interface TransferProvider {
  send(method: string, params: unknown[]): Promise<unknown>;
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
 * Low-level chain access for the hybrid provider architecture:
 *   - EVM: ethers JsonRpcProvider over Alchemy HTTP URL for RPC + broadcast.
 *     Deposit detection via Alchemy Address Activity Webhook (push).
 *   - BTC: Alchemy Bitcoin JSON-RPC for broadcast + confirmation checks.
 *     Deposit detection via Alchemy WebSocket subscribeAddresses (push).
 * All signing keys derive from the HD master seed.
 *
 * EVM nonces are serialized per derivation-index via an async mutex so that
 * concurrent broadcasts from the same address never collide on the RPC node.
 */
@Injectable()
export class ChainClientService {
  private readonly logger = new Logger(ChainClientService.name);
  /** Per-chain EVM JsonRpcProvider instances. */
  private readonly evmProviders = new Map<string, JsonRpcProvider>();
  /** Solana Connection per network URL (typically a single cluster). */
  private readonly solanaConnections = new Map<string, Connection>();
  /** TronWeb instances per HTTP URL (read-only, no private key). */
  private readonly tronWebClients = new Map<string, TronWeb>();

  /** Per-index async locks ensuring one EVM broadcast at a time per signer. */
  private readonly evmNonceLocks = new Map<number, Promise<void>>();

  constructor(
    private readonly httpService: HttpService,
    private readonly config: CryptoConfigService,
    private readonly hdWallet: HdWalletService,
  ) {}

  /** Serialize EVM broadcasts per derivation index to prevent nonce races. */
  private async withNonceLock<T>(
    index: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    // Wait for any pending broadcast on this index, then run ours.
    const prev = this.evmNonceLocks.get(index);
    const chain = (prev ?? Promise.resolve()).then(
      () => fn(),
      () => fn(),
    );
    // Store our promise so the next caller waits for us.
    this.evmNonceLocks.set(
      index,
      chain.then(
        () => {},
        () => {},
      ),
    );
    try {
      return await chain;
    } finally {
      // Clean up if we're the last in line.
      if (
        this.evmNonceLocks.get(index) ===
        chain.then(
          () => {},
          () => {},
        )
      ) {
        this.evmNonceLocks.delete(index);
      }
    }
  }

  // ─── EVM Provider ──────────────────────────────────────────────────────

  get provider(): JsonRpcProvider {
    return this.providerForChain('ETH');
  }

  /** EVM JsonRpcProvider for a specific EVM-family chain (ETH/BSC/POLYGON). */
  providerForChain(chain: string): JsonRpcProvider {
    const existing = this.evmProviders.get(chain);
    if (existing) return existing;
    const url = this.config.httpUrlForChain(chain);
    if (!url) {
      throw new InternalServerErrorException(
        `ALCHEMY_${chain}_HTTP_URL is not configured`,
      );
    }
    const provider = new JsonRpcProvider(url);
    this.evmProviders.set(chain, provider);
    return provider;
  }

  /** Configured Solana RPC URL (throws if missing). */
  private solanaUrl(): string {
    const url = this.config.httpUrlForChain('SOLANA');
    if (!url) {
      throw new InternalServerErrorException(
        'ALCHEMY_SOLANA_HTTP_URL is not configured',
      );
    }
    return url;
  }

  /** Solana Connection for the configured RPC URL (cached). */
  private solanaConnection(): Connection {
    const url = this.solanaUrl();
    const existing = this.solanaConnections.get(url);
    if (existing) return existing;
    const connection = new Connection(url, 'confirmed');
    this.solanaConnections.set(url, connection);
    return connection;
  }

  /**
   * Read-only TronWeb client for the configured TRON RPC URL.
   * Broadcasts use a separate PrivateKey-attached instance (see below).
   */
  private tronWebRead(): TronWeb {
    const url = this.config.httpUrlForChain('TRON');
    if (!url) {
      throw new InternalServerErrorException(
        'ALCHEMY_TRON_HTTP_URL is not configured',
      );
    }
    const existing = this.tronWebClients.get(url);
    if (existing) return existing;
    const client = new TronWeb({ fullHost: url });
    this.tronWebClients.set(url, client);
    return client;
  }

  /** Underlying chain family for a Chain. */
  chainFamily(chain: Chain): ChainFamily {
    return this.config.chainFamily(chain);
  }

  // ─── Bitcoin JSON-RPC (Alchemy) ───────────────────────────────────────

  private get btcRpcUrl(): string {
    const url = this.config.alchemyBtcHttpUrl;
    if (!url) {
      throw new InternalServerErrorException(
        'ALCHEMY_BTC_HTTP_URL is not configured',
      );
    }
    return url;
  }

  private get btcNetwork(): bitcoin.Network {
    return this.config.isTestnet
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
  }

  private async btcRpcCall<T>(
    method: string,
    params: unknown[] = [],
  ): Promise<T> {
    const res = await lastValueFrom(
      this.httpService.post<JsonRpcResponse<T>>(
        this.btcRpcUrl,
        { jsonrpc: '2.0', id: 1, method, params },
        { timeout: 15_000, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    if (res.data.error) {
      throw new Error(
        `Bitcoin RPC ${method} failed: ${res.data.error.message} (code ${res.data.error.code})`,
      );
    }
    return res.data.result as T;
  }

  // ─── EVM Reads ─────────────────────────────────────────────────────────

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

  async getEvmBalance(
    address: string,
    currency: Currency,
    chain: string = 'ETH',
  ): Promise<number> {
    const provider = this.providerForChain(chain);
    if (currency === Currency.ETH) {
      return Number(formatEther(await provider.getBalance(address)));
    }
    const contract = this.config.getStablecoinContractFor(chain, currency);
    if (!contract) return 0;
    const token = new Contract(contract, ERC20_ABI, provider);
    const raw = (await token.balanceOf(address)) as bigint;
    return Number(formatUnits(raw, this.decimalsFor(currency)));
  }

  /**
   * Transfer scan for a block range via alchemy_getAssetTransfers (one call,
   * ~30 CU). Used for catch-up scanning if needed.
   */
  async getAssetTransfers(
    provider: TransferProvider,
    params: AssetTransfersParams,
  ): Promise<EvmAssetTransfer[]> {
    const { fromBlock, toBlock, categories = ['external', 'erc20'] } = params;
    const toAddresses = params.toAddresses.map((a) => a.toLowerCase());
    try {
      return await this.fetchAssetTransfers(
        provider,
        fromBlock,
        toBlock,
        toAddresses,
        categories,
      );
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.warn(
        `alchemy_getAssetTransfers array query failed (${err.message}); falling back to per-address queries`,
      );
      const all: EvmAssetTransfer[] = [];
      for (const address of toAddresses) {
        all.push(
          ...(await this.fetchAssetTransfers(
            provider,
            fromBlock,
            toBlock,
            [address],
            categories,
          )),
        );
      }
      return all;
    }
  }

  private async fetchAssetTransfers(
    provider: TransferProvider,
    fromBlock: number,
    toBlock: number,
    toAddresses: string[],
    categories: ('external' | 'erc20')[],
  ): Promise<EvmAssetTransfer[]> {
    const transfers: EvmAssetTransfer[] = [];
    let pageKey: string | undefined;
    do {
      const request: Record<string, unknown> = {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        toAddress: toAddresses,
        category: categories,
        order: 'asc',
        maxCount: '0x3e8',
      };
      if (pageKey) request.pageKey = pageKey;
      const result = (await provider.send('alchemy_getAssetTransfers', [
        request,
      ])) as {
        transfers?: Array<{
          category?: string;
          from?: string;
          to?: string;
          value?: string;
          asset?: string;
          hash?: string;
          blockNum?: string;
          rawContract?: { decimal?: string };
        }>;
        pageKey?: string;
      };
      const items = Array.isArray(result?.transfers) ? result.transfers : [];
      for (const t of items) {
        const category = t.category ?? '';
        const blockNumber = parseInt(t.blockNum ?? '', 16);
        if (!Number.isFinite(blockNumber)) continue;
        const raw = BigInt(t.value ?? '0');
        const decimals = t.rawContract?.decimal
          ? Number(t.rawContract.decimal)
          : category === 'external'
            ? 18
            : 6;
        const amount = parseFloat(formatUnits(raw, decimals));
        transfers.push({
          category,
          from: (t.from ?? '').toLowerCase(),
          to: (t.to ?? '').toLowerCase(),
          value: t.value ?? '0',
          amount,
          asset: t.asset ?? '',
          hash: t.hash ?? '',
          blockNumber,
        });
      }
      pageKey = result?.pageKey;
    } while (pageKey && transfers.length < 10_000);
    return transfers;
  }

  // ─── Bitcoin Reads (Alchemy RPC) ──────────────────────────────────────

  async getBtcTipHeight(): Promise<number> {
    const height = await this.btcRpcCall<number>('getblockcount');
    if (!Number.isFinite(height)) {
      throw new Error(
        `Alchemy BTC getblockcount returned non-numeric value: "${String(height)}"`,
      );
    }
    return height;
  }

  /**
   * Checks the status of a BTC transaction via Alchemy's getrawtransaction.
   * Returns confirmation info for the withdrawal tracker.
   */
  async getBtcTxStatus(txid: string): Promise<BtcTxStatus> {
    try {
      const tx = await this.btcRpcCall<{
        confirmations?: number;
        blockhash?: string;
        blockheight?: number;
        blocktime?: number;
        error?: string;
      }>('getrawtransaction', [txid, true]);

      if (tx.error) {
        return { confirmed: false, blockHeight: null, error: tx.error };
      }
      if (tx.confirmations && tx.confirmations > 0) {
        return {
          confirmed: true,
          blockHeight: tx.blockheight ?? null,
        };
      }
      return { confirmed: false, blockHeight: null };
    } catch (error) {
      const err = error as ErrorLike;
      return { confirmed: false, blockHeight: null, error: err.message };
    }
  }

  async getBtcRecommendedFee(): Promise<number> {
    try {
      const result = await this.btcRpcCall<{ feerate?: number }>(
        'estimatesmartfee',
        [6],
      );
      // estimatesmartfee returns BTC/kB, we want sat/vB
      if (result.feerate && result.feerate > 0) {
        // BTC/kB to sat/vB: multiply by 100000 / 1000 = 100
        return Math.ceil(result.feerate * 100);
      }
      return 2;
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.warn(
        `BTC fee estimate failed (${err.message}); using 2 sat/vB`,
      );
      return 2;
    }
  }

  /** Confirmed utxos for a bech32 address via Alchemy's listunspent. */
  async getBtcUtxos(address: string): Promise<BtcUtxo[]> {
    const utxos = await this.btcRpcCall<
      Array<{
        txid: string;
        vout: number;
        amount: number;
        confirmations: number;
        blockheight?: number;
      }>
    >('listunspent', [1, 9999999, [address]]);

    return utxos
      .filter((u) => u.confirmations > 0)
      .map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: Math.round(Number(u.amount.toFixed(8)) * 1e8),
        blockHeight: u.blockheight ?? 0,
      }));
  }

  // ─── EVM Broadcast ─────────────────────────────────────────────────────

  async broadcastEvmNative(
    fromIndex: number,
    to: string,
    amount: number,
    chain: string = 'ETH',
  ): Promise<string> {
    return this.withNonceLock(fromIndex, async () => {
      const signer = this.evmSigner(fromIndex, chain);
      const tx = await signer.sendTransaction({
        to,
        value: parseEther(Number(amount).toFixed(18)),
      });
      this.logger.log(
        `${chain} native broadcast: ${amount} ${to} (TX: ${tx.hash})`,
      );
      return tx.hash;
    });
  }

  async broadcastEvmToken(
    currency: Currency,
    fromIndex: number,
    to: string,
    amount: number,
    chain: string = 'ETH',
  ): Promise<string> {
    const contract = this.config.getStablecoinContractFor(chain, currency);
    if (!contract) {
      throw new InternalServerErrorException(
        `No ${currency} contract configured for ${chain}`,
      );
    }
    const decimals = this.decimalsFor(currency);
    return this.withNonceLock(fromIndex, async () => {
      const signer = this.evmSigner(fromIndex, chain);
      const token = new Contract(contract, ERC20_ABI, signer);
      const tx = (await token.transfer(
        to,
        parseUnits(Number(amount).toFixed(decimals), decimals),
      )) as ContractTransactionResponse;
      this.logger.log(
        `${currency} broadcast on ${chain}: ${amount} ${to} (TX: ${tx.hash})`,
      );
      return tx.hash;
    });
  }

  // ─── Solana Read + Broadcast ──────────────────────────────────────────

  /** Native SOL balance (LC) for an address. */
  async getSolBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address);
    const lamports = await this.solanaConnection().getBalance(pubkey);
    return Number((lamports / LAMPORTS_PER_SOL).toFixed(9));
  }

  /**
   * SPL token balance for an owner given the mint address, using the
   * owner's associated token account (derived via getAssociatedTokenAddress).
   */
  async getSolanaTokenBalance(mint: string, owner: string): Promise<number> {
    const connection = this.solanaConnection();
    const mintPub = new PublicKey(mint);
    const ownerPub = new PublicKey(owner);
    const { value: accounts } = await connection.getTokenAccountsByOwner(
      ownerPub,
      {
        mint: mintPub,
      },
    );
    if (accounts.length === 0) return 0;
    // Decode the first matching token account: amount is a u64 at offset 64.
    const data = Buffer.from(accounts[0].account.data as Uint8Array);
    const amountRaw = data.readBigUInt64LE(64);
    return Number((Number(amountRaw) / 1e6).toFixed(6));
  }

  /**
   * Transfers SPL tokens (USDT/USDC) from the owner keypair at fromIndex to
   * `to`. Creates the destination ATA if absent, then transfers in one tx.
   * Returns the transaction signature.
   */
  async broadcastSolanaToken(
    currency: Currency,
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    const mint = this.config.getStablecoinContractFor('SOLANA', currency);
    if (!mint) {
      throw new InternalServerErrorException(
        `No ${currency} SPL mint configured for SOLANA`,
      );
    }
    const connection = this.solanaConnection();
    const payer = this.hdWallet.solKeypair(fromIndex);
    const mintPub = new PublicKey(mint);
    const destination = new PublicKey(to);

    const fromAta = await getAssociatedTokenAddress(
      mintPub,
      payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const toAta = await getAssociatedTokenAddress(
      mintPub,
      destination,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const tx = new Transaction();
    const toInfo = await connection.getAccountInfo(toAta);
    if (!toInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          toAta,
          destination,
          mintPub,
        ),
      );
    }

    const amountRaw = BigInt(Math.round(amount * 1e6));
    tx.add(
      createTransferInstruction(fromAta, toAta, payer.publicKey, amountRaw),
    );

    try {
      tx.feePayer = payer.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(payer);
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      this.logger.log(
        `SOLANA ${currency} broadcast: ${amount} ${to} (TX: ${sig})`,
      );
      return sig;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`SOLANA ${currency} broadcast failed: ${err.message}`);
      throw new InternalServerErrorException(
        `SOLANA ${currency} broadcast failed: ${err.message}`,
      );
    }
  }

  /**
   * Returns 1 if the tx signature is confirmed/finalized, 0 if still
   * processing, and null if not found. Used by the withdrawal tracker.
   */
  async getSolanaSignatureStatuses(sig: string): Promise<number | null> {
    const connection = this.solanaConnection();
    const responses = await connection.getSignatureStatuses([sig]);
    const status = responses?.value?.[0];
    if (!status) return null;
    if (status.err) {
      return 0;
    }
    return status.confirmationStatus === 'processed' ? 0 : 1;
  }

  // ─── TRON Read + Broadcast ────────────────────────────────────────────

  /** Native TRX balance (sun / 1e6) for an address. */
  async getTrxBalance(address: string): Promise<number> {
    const client = this.tronWebRead();
    const sun = await client.trx.getBalance(address);
    return Number((Number(sun) / 1e6).toFixed(6));
  }

  /** TRC-20 token balance for an address given the contract address. */
  async getTronTokenBalance(
    contract: string,
    address: string,
  ): Promise<number> {
    const client = this.tronWebRead();
    // tronweb's contract/CHAINSCAN accessors are loosely typed (any); the
    // result is normalized here so the rest of the code stays type-safe.
    const tokenContract = (await client
      .contract()
      .at(contract)) as unknown as TronWebContract;
    const raw = await tokenContract.balanceOf(address).call();
    return Number((Number(raw.toString()) / 1e6).toFixed(6));
  }

  /**
   * TronWeb client bound to a private key for signing TRC-20 / TRX sends.
   * Cached per (url, address) so repeated broadcasts reuse the client.
   */
  private tronWebSigner(fromIndex: number): TronWeb {
    const url = this.config.httpUrlForChain('TRON');
    if (!url) {
      throw new InternalServerErrorException(
        'ALCHEMY_TRON_HTTP_URL is not configured',
      );
    }
    const privateKey = this.hdWallet.derivePrivateKeyForChain(
      'TRON',
      fromIndex,
    );
    const cacheKey = `${url}:${fromIndex}`;
    const existing = this.tronWebClients.get(cacheKey);
    if (existing) return existing;
    const client = new TronWeb({ fullHost: url, privateKey });
    this.tronWebClients.set(cacheKey, client);
    return client;
  }

  /** Broadcasts a TRC-20 token transfer (USDT/USDC) on TRON. */
  async broadcastTronToken(
    currency: Currency,
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    const contract = this.config.getStablecoinContractFor('TRON', currency);
    if (!contract) {
      throw new InternalServerErrorException(
        `No ${currency} TRC-20 contract configured for TRON`,
      );
    }
    const client = this.tronWebSigner(fromIndex);
    try {
      // TRC-20 USDT/USDC use 6 decimals.
      const rawAmount = Math.round(amount * 1e6).toString();
      const tokenContract = (await client
        .contract()
        .at(contract)) as unknown as {
        transfer(to: string, amount: string): {
          send(options?: { feeLimit?: number }): Promise<string>;
        };
      };
      const txId = await tokenContract
        .transfer(to, rawAmount)
        .send({ feeLimit: 25_000_000 });
      this.logger.log(
        `TRON ${currency} broadcast: ${amount} ${to} (TX: ${txId})`,
      );
      return txId;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`TRON ${currency} broadcast failed: ${err.message}`);
      throw new InternalServerErrorException(
        `TRON ${currency} broadcast failed: ${err.message}`,
      );
    }
  }

  /** Broadcasts a native TRX transfer on TRON. */
  async broadcastTronNative(
    fromIndex: number,
    to: string,
    amountTrx: number,
  ): Promise<string> {
    const client = this.tronWebSigner(fromIndex);
    try {
      const sun = Math.round(Number(amountTrx) * 1e6);
      // tronweb's return type is a generic SignedTransaction object; the txid
      // is accessible via the transaction id. Normalize to string here.
      const res = await client.trx.sendTransaction(to, sun);
      const txId = String((res as unknown as { txid?: string }).txid ?? res);
      this.logger.log(`TRON native broadcast: ${amountTrx} TRX (TX: ${txId})`);
      return txId;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`TRON native broadcast failed: ${err.message}`);
      throw new InternalServerErrorException(
        `TRON native broadcast failed: ${err.message}`,
      );
    }
  }

  /**
   * Confirmation status for a TRON tx. Returns null if the tx is not yet
   * on-chain; otherwise the block number and whether it is confirmed.
   */
  async getTronReceipt(txHash: string): Promise<{
    confirmed: boolean;
    blockNumber: number;
  } | null> {
    const client = this.tronWebRead();
    try {
      const info = (await client.trx.getTransactionInfo(txHash)) as unknown as {
        blockNumber?: number;
        receipt?: { result?: string };
      };
      if (!info || typeof info.blockNumber !== 'number') {
        return null;
      }
      const failed =
        info.receipt?.result === 'REVERT' || info.receipt?.result === 'FAILED';
      return {
        confirmed: !failed,
        blockNumber: info.blockNumber,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `TRON getTransactionInfo failed for ${txHash}: ${err.message}`,
      );
      return null;
    }
  }

  // ─── On-chain History (admin pull) ──────────────────────────────────────

  /**
   * Parsed SPL token transfers (USDT/USDC) touching an owner address. Inbound
   * SPL transfers credit the owner's associated token account (ATA), so both
   * the owner and its ATA are queried for recent signatures.
   */
  async getSolanaTransfers(
    ownerAddress: string,
    mint: string,
    limit = 50,
  ): Promise<
    Array<{
      txHash: string;
      mint: string;
      amount: number;
      from: string | null;
      to: string | null;
      blockNumber: number | null;
      confirmed: boolean;
    }>
  > {
    const connection = this.solanaConnection();
    const owner = new PublicKey(ownerAddress);
    const mintPub = new PublicKey(mint);
    const ata = await getAssociatedTokenAddress(
      mintPub,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const targets = [owner, ata];

    const signatures = new Set<string>();
    for (const target of targets) {
      try {
        const res = await connection.getSignaturesForAddress(target, { limit });
        for (const item of res) {
          if (item.signature) signatures.add(item.signature);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Solana getSignaturesForAddress failed for ${target.toBase58()}: ${err.message}`,
        );
      }
      if (signatures.size >= limit) break;
    }

    const events: Array<{
      txHash: string;
      mint: string;
      amount: number;
      from: string | null;
      to: string | null;
      blockNumber: number | null;
      confirmed: boolean;
    }> = [];
    for (const signature of [...signatures].slice(0, limit)) {
      let parsed;
      try {
        parsed = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Solana getParsedTransaction failed ${signature}: ${err.message}`,
        );
        continue;
      }
      if (!parsed?.meta) continue;

      const pre = new Map<string, number>();
      const post = new Map<string, number>();
      for (const b of parsed.meta.preTokenBalances ?? []) {
        if (b.mint !== mint || !b.owner) continue;
        pre.set(b.owner, Number(b.uiTokenAmount?.uiAmount ?? 0));
      }
      for (const b of parsed.meta.postTokenBalances ?? []) {
        if (b.mint !== mint || !b.owner) continue;
        post.set(b.owner, Number(b.uiTokenAmount?.uiAmount ?? 0));
      }
      const owners = new Set([...pre.keys(), ...post.keys()]);
      let delta = 0;
      let to: string | null = null;
      for (const o of owners) {
        const diff = (post.get(o) ?? 0) - (pre.get(o) ?? 0);
        delta += diff;
        if (diff > 0) to = o;
      }
      if (delta === 0) continue;

      events.push({
        txHash: signature,
        mint,
        amount: Math.abs(delta),
        from: delta < 0 ? ownerAddress : null,
        to,
        blockNumber: parsed.slot,
        confirmed:
          parsed.confirmationStatus === 'confirmed' ||
          parsed.confirmationStatus === 'finalized',
      });
    }
    return events;
  }

  /** Minimal shape of a TronGrid v1 TRC-20 transfer entry. */
  async getTronTransfers(
    address: string,
    contract: string,
    limit = 50,
  ): Promise<
    Array<{
      txHash: string;
      amount: number;
      from: string;
      to: string;
      blockNumber: number;
      tokenSymbol: string | null;
    }>
  > {
    const baseUrl = this.config.httpUrlForChain('TRON');
    if (!baseUrl) {
      throw new InternalServerErrorException(
        'ALCHEMY_TRON_HTTP_URL is not configured',
      );
    }
    const url = `${baseUrl.replace(/\/+$/, '')}/v1/accounts/${address}/transactions/trc20`;
    const res = await lastValueFrom(
      this.httpService.get<{
        data?: Array<{
          transaction_id: string;
          type: string;
          to: string | null;
          from: string | null;
          value: string | null;
          block_timestamp: number | null;
          token_info?: {
            address?: string;
            symbol?: string;
            decimals?: number;
          };
        }>;
      }>(url, {
        params: {
          contract_address: contract,
          limit: Math.min(200, limit),
          order_by: 'block_timestamp,desc',
        },
        timeout: 20_000,
      }),
    );
    const items = Array.isArray(res.data?.data) ? res.data.data : [];
    const lower = address.toLowerCase();
    return items
      .filter(
        (t) =>
          t.type === 'Transfer' && (t.to || '').toLowerCase() === lower,
      )
      .slice(0, limit)
      .map((t) => ({
        txHash: t.transaction_id,
        amount: Number(t.value ?? 0) / 1e6,
        from: t.from || '',
        to: (t.to || '').toLowerCase(),
        blockNumber: Math.floor((t.block_timestamp || 0) / 1000),
        tokenSymbol: t.token_info?.symbol ?? null,
      }));
  }

  // ─── BTC Broadcast (Alchemy RPC) ──────────────────────────────────────

  /**
   * Broadcasts a native BTC payment from the derived index to `to`. Performs
   * descending coin selection over confirmed utxos; change returns to the
   * source address. Returns the txid.
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

    const txid = await this.btcRpcCall<string>('sendrawtransaction', [
      rawHex,
      0.1,
    ]);
    this.logger.log(`BTC broadcast: ${amountBtc} ${to} (TX: ${txid})`);
    return txid;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private evmSigner(fromIndex: number, chain: string = 'ETH'): Wallet {
    const pk = this.hdWallet.derivePrivateKey(Currency.ETH, fromIndex);
    return new Wallet(pk, this.providerForChain(chain));
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

  chainKind(currency: Currency): ChainKind | null {
    return this.hdWallet.chainForCurrency(currency);
  }
}
