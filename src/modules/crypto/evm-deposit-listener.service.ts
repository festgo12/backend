import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  WebSocketProvider,
  Log,
  formatUnits,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService, EvmAssetTransfer } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

const TRANSFER_TOPIC = keccak256(
  toUtf8Bytes('Transfer(address,address,uint256)'),
);
const STABLECOIN_DECIMALS = 6;
const RECENT_HASHES_MAX = 2048;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;

interface ErrorLike {
  message?: string;
  code?: string;
}

export interface EvmDepositListenerStatus {
  enabled: boolean;
  connected: boolean;
  lastConnectedAt: string | null;
  lastError: string | null;
  depositsDetected: number;
  catchUpRuns: number;
  pendingCount: number;
  latestBlock: number | null;
}

/**
 * Live EVM deposit listener backed by an Alchemy WebSocket stream.
 *
 *  - ERC-20 USDT/USDC: `eth_subscribe("logs", ...)` on the Transfer topic
 *    (push, ~0 CU).
 *  - Native ETH: `newHeads` blocks are buffered and scanned in batches
 *    (EVM_ASSET_TRANSFER_BATCH_BLOCKS / _MAX_MS) with a single
 *    alchemy_getAssetTransfers call per batch (~30 CU), so steady-state CU is
 *    ~26 CU/block instead of ~60.
 *  - Confirmation depth: deposits are recorded PENDING on detection and only
 *    finalised (ledger credit) once the block reaches evmConfirmations, after
 *    re-verifying the canonical receipt. Stale PENDING rows (re-org'd away)
 *    are cancelled.
 *  - Reconnect: ethers' WebSocketProvider does not auto-reconnect, so a
 *    failed socket triggers a reconnect loop with backoff. Only after the
 *    socket was actually down is the gap since the cursor re-scanned with a
 *    single alchemy_getAssetTransfers call - the only RPC-heavy path.
 *  - Re-org on a healthy socket: cursor + hash chain are reset and live
 *    newHeads continue; no full catch-up rescan is issued.
 */
@Injectable()
export class EvmDepositListenerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EvmDepositListenerService.name);
  private provider: WebSocketProvider | null = null;
  private connected = false;
  private lastConnectedAt: Date | null = null;
  private lastError: string | null = null;
  private depositsDetected = 0;
  private catchUpRuns = 0;
  private latestBlock: number | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private catchUpRetryTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private connecting = false;
  private batchFlushing = false;
  private socketDown = false;
  private pendingBlocks = new Set<number>();
  private recentHashes = new Map<number, string>();
  private cursorLastBlock = 0;
  private cursorLastBlockHash: string | null = null;
  private lastCatchUpAt = 0;
  private pendingHashes = new Set<string>();
  private pendingCacheLoaded = false;
  private staleReceiptMisses = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly config: CryptoConfigService,
    private readonly chainClient: ChainClientService,
  ) {}

  async onApplicationBootstrap() {
    await this.depositRegistry.rebuild();
    if (!this.config.alchemyEthWsUrl) {
      this.logger.warn(
        'ALCHEMY_ETH_WS_URL is not configured; EVM WebSocket deposit listener is disabled.',
      );
      return;
    }
    await this.connect();
  }

  onApplicationShutdown() {
    this.teardown();
  }

  async getStatus(): Promise<EvmDepositListenerStatus> {
    const pendingCount = await this.prisma.walletTransaction.count({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'EVM_WS' },
      },
    });
    return {
      enabled: Boolean(this.config.alchemyEthWsUrl),
      connected: this.connected,
      lastConnectedAt: this.lastConnectedAt?.toISOString() ?? null,
      lastError: this.lastError,
      depositsDetected: this.depositsDetected,
      catchUpRuns: this.catchUpRuns,
      pendingCount,
      latestBlock: this.latestBlock,
    };
  }

  // --- Connection lifecycle ---

  private async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    try {
      this.teardown(false);
      const url = this.config.alchemyEthWsUrl!;
      const provider = new WebSocketProvider(url);
      this.provider = provider;

      const ws = provider.websocket as unknown as {
        onclose: ((event: unknown) => void) | null;
        onerror: ((event: unknown) => void) | null;
      };
      ws.onclose = () => {
        void this.handleClose();
      };
      ws.onerror = (event: unknown) => {
        const err = event as ErrorLike;
        this.logger.warn(
          `EVM WebSocket transport error: ${err?.message || 'unknown'}`,
        );
      };

      // Live pushes (0 CU): newHeads for native ETH, logs for USDT/USDC.
      await provider.on('block', (blockNumber: number) => {
        this.pendingBlocks.add(blockNumber);
        this.scheduleBatchFlush();
      });
      await this.subscribeTokens(provider);

      // Wait until the socket is actually serving before first scan.
      await provider.getBlockNumber();

      this.connected = true;
      this.lastConnectedAt = new Date();
      this.lastError = null;
      this.reconnectAttempts = 0;
      this.logger.log('EVM WebSocket connected; listening for deposits');

      // Re-scan the gap since the cursor (reconnect path / cold start).
      // Deliberately isolated from the connect() try: a catch-up failure must
      // not tear down an otherwise healthy socket or trigger a reconnect.
      try {
        await this.catchUp();
        const latest = await provider.getBlockNumber();
        await this.finalizePendingDeposits(
          latest - this.config.evmConfirmations + 1,
        );
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.error(`EVM catch-up after connect failed: ${err.message}`);
        this.scheduleCatchUpRetry();
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.lastError = err.message || 'unknown';
      this.connected = false;
      this.logger.error(`EVM WebSocket connect failed: ${this.lastError}`);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private handleClose(): void {
    this.connected = false;
    this.socketDown = true;
    this.logger.warn('EVM WebSocket connection closed');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
    );
    this.reconnectAttempts += 1;
    this.logger.log(`EVM WebSocket reconnect scheduled in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  /**
   * One-shot retry of the gap re-scan after a failed catch-up. Runs at the
   * configured minimum catch-up interval and only while the socket is up.
   */
  private scheduleCatchUpRetry(): void {
    if (this.catchUpRetryTimer) return;
    const delay = Math.max(this.config.evmCatchUpMinIntervalMs, 5_000);
    this.logger.log(`EVM catch-up retry scheduled in ${delay}ms`);
    this.catchUpRetryTimer = setTimeout(() => {
      this.catchUpRetryTimer = null;
      if (!this.connected) return;
      void this.catchUp().catch((error: ErrorLike) => {
        this.logger.error(`EVM catch-up retry failed: ${error.message}`);
        this.scheduleCatchUpRetry();
      });
    }, delay);
  }

  private teardown(clearReconnect = true): void {
    if (clearReconnect && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.catchUpRetryTimer) {
      clearTimeout(this.catchUpRetryTimer);
      this.catchUpRetryTimer = null;
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    const provider = this.provider;
    this.provider = null;
    this.connected = false;
    this.pendingBlocks.clear();
    if (provider) {
      try {
        const ws = provider.websocket as unknown as { onclose: null };
        ws.onclose = null;
      } catch {
        /* socket already gone */
      }
      void provider.removeAllListeners();
      try {
        if (!provider.destroyed) void provider.destroy();
      } catch {
        /* ignore */
      }
    }
  }

  private async subscribeTokens(provider: WebSocketProvider): Promise<void> {
    const contracts = [
      {
        currency: Currency.USDT,
        address: this.config.getStablecoinContract('USDT'),
      },
      {
        currency: Currency.USDC,
        address: this.config.getStablecoinContract('USDC'),
      },
    ];
    for (const { currency, address } of contracts) {
      if (!address) continue;
      await provider.on(
        { address: address.toLowerCase(), topics: [TRANSFER_TOPIC] },
        (log: Log) => {
          void this.handleTransferLog(log, currency);
        },
      );
    }
  }

  // --- Live handlers (push) ---

  private async handleTransferLog(log: Log, currency: Currency): Promise<void> {
    if (!log.topics?.[2]) return;
    if (log.removed) {
      await this.cancelRemovedTransfer(log.transactionHash);
      return;
    }
    const to = '0x' + log.topics[2].slice(26).toLowerCase();
    if (!this.depositRegistry.has(to, 'EVM')) return;
    const amount = Number(formatUnits(BigInt(log.data), STABLECOIN_DECIMALS));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const from = log.topics[1]
      ? '0x' + log.topics[1].slice(26).toLowerCase()
      : null;
    await this.recordPending({
      address: to,
      currency,
      amount,
      txHash: log.transactionHash,
      sourceAddress: from,
      blockNumber: log.blockNumber,
    });
  }

  /**
   * A re-org can emit `removed` logs for token transfers that no longer exist
   * on the canonical chain. Cancel the PENDING deposit so it never finalises.
   */
  private async cancelRemovedTransfer(txHash: string): Promise<void> {
    if (!txHash) return;
    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: txHash },
    });
    if (!existing || existing.status !== 'PENDING') return;
    await this.walletService.updateTransactionStatus(existing.id, 'CANCELLED', {
      finalization: 'REORG_REMOVED_LOG',
      cancelledAt: new Date().toISOString(),
    });
    this.pendingHashes.delete(txHash);
    this.staleReceiptMisses.delete(txHash);
    this.logger.warn(`Deposit cancelled (REORG_REMOVED_LOG): ${txHash}`);
  }

  // --- Steady state: batched transfer scans ---

  /**
   * Flush the buffered newHeads blocks once the batch is full or the max
   * wait elapses. Each flush performs one alchemy_getAssetTransfers call over
   * the buffered range plus hashes-only block reads for re-org detection.
   */
  private scheduleBatchFlush(): void {
    if (
      this.pendingBlocks.size >=
      Math.max(1, this.config.evmAssetTransferBatchBlocks)
    ) {
      void this.flushBatch();
      return;
    }
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(
      () => {
        this.batchTimer = null;
        void this.flushBatch();
      },
      Math.max(1, this.config.evmAssetTransferBatchMaxMs),
    );
  }

  private async flushBatch(): Promise<void> {
    if (this.batchFlushing) return;
    this.batchFlushing = true;
    try {
      if (this.pendingBlocks.size === 0) return;
      const numbers = [...this.pendingBlocks].sort((a, b) => a - b);
      this.pendingBlocks.clear();
      const first = numbers[0];
      const last = numbers[numbers.length - 1];
      const provider = this.provider;
      if (!provider) return;

      this.latestBlock = last;
      const required = this.config.evmConfirmations;
      const maxFrom = last - required + 1;

      const addresses = this.depositRegistry.addressesForChain('EVM');

      if (maxFrom > 0) {
        await this.finalizePendingDeposits(maxFrom);
      }

      const reorged = await this.checkReorg(provider, numbers, maxFrom);
      if (reorged) {
        // Re-scan the affected span on the new canonical chain; live newHeads
        // cover anything above it (no full catch-up on a healthy socket).
        if (addresses.length > 0) {
          await this.scanTransfers(
            provider,
            Math.max(1, maxFrom),
            last,
            addresses,
          );
        }
        return;
      }

      if (addresses.length > 0) {
        await this.scanTransfers(provider, first, last, addresses);
      }

      if (maxFrom > this.cursorLastBlock) {
        const boundaryHash = this.recentHashes.get(maxFrom) ?? null;
        await this.prisma.chainCursor.upsert({
          where: { chain: 'EVM' },
          update: { lastBlock: maxFrom, lastBlockHash: boundaryHash },
          create: {
            chain: 'EVM',
            lastBlock: maxFrom,
            lastBlockHash: boundaryHash,
          },
        });
        this.cursorLastBlock = maxFrom;
        this.cursorLastBlockHash = boundaryHash;
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`EVM batch scan failed: ${err.message}`);
    } finally {
      this.batchFlushing = false;
    }
  }

  /**
   * Re-org detection via hashes-only block reads. Returns true when the
   * canonical chain diverged (parent hash mismatch or a different hash on the
   * confirmed boundary); in that case the cursor + hash chain are reset and
   * live newHeads continue - no catch-up rescan is issued.
   */
  private async checkReorg(
    provider: WebSocketProvider,
    numbers: number[],
    maxFrom: number,
  ): Promise<boolean> {
    let reorged = false;
    for (const b of numbers) {
      const block = await provider.getBlock(b, false);
      if (!block) continue;
      if (block.hash) {
        this.recentHashes.set(b, block.hash);
        if (this.recentHashes.size > RECENT_HASHES_MAX) {
          const oldest = Math.min(...this.recentHashes.keys());
          this.recentHashes.delete(oldest);
        }
      }
      const prevHash = this.recentHashes.get(b - 1);
      if (block.parentHash && prevHash && block.parentHash !== prevHash) {
        reorged = true;
      }
    }
    const boundaryHash = this.recentHashes.get(maxFrom);
    if (
      this.cursorLastBlockHash &&
      boundaryHash &&
      boundaryHash !== this.cursorLastBlockHash
    ) {
      reorged = true;
    }
    if (!reorged) return false;
    this.logger.warn(
      `EVM re-org detected near block ${numbers[numbers.length - 1]}; resetting cursor (live newHeads continue)`,
    );
    await this.rewindForReorg(maxFrom);
    return true;
  }

  private async rewindForReorg(maxFrom: number): Promise<void> {
    this.cursorLastBlock = 0;
    this.cursorLastBlockHash = null;
    this.recentHashes.clear();
    await this.prisma.chainCursor.upsert({
      where: { chain: 'EVM' },
      update: { lastBlock: Math.max(0, maxFrom - 1), lastBlockHash: null },
      create: {
        chain: 'EVM',
        lastBlock: Math.max(0, maxFrom - 1),
        lastBlockHash: null,
      },
    });
  }

  /**
   * One alchemy_getAssetTransfers call over [fromBlock..toBlock] for all
   * registered addresses (native ETH + ERC-20). Idempotent via recordPending.
   */
  private async scanTransfers(
    provider: WebSocketProvider,
    fromBlock: number,
    toBlock: number,
    addresses: string[],
  ): Promise<void> {
    if (fromBlock > toBlock) return;
    const transfers = await this.chainClient.getAssetTransfers(provider, {
      fromBlock,
      toBlock,
      toAddresses: addresses,
    });
    const addressSet = new Set(addresses.map((a) => a.toLowerCase()));
    for (const t of transfers) {
      if (!addressSet.has(t.to)) continue;
      if (!Number.isFinite(t.amount) || t.amount <= 0) continue;
      const currency = this.currencyForTransfer(t);
      if (!currency) continue;
      await this.recordPending({
        address: t.to,
        currency,
        amount: t.amount,
        txHash: t.hash,
        sourceAddress: t.from || null,
        blockNumber: t.blockNumber,
      });
    }
  }

  private currencyForTransfer(transfer: EvmAssetTransfer): Currency | null {
    if (transfer.category === 'external') return Currency.ETH;
    const asset = (transfer.asset ?? '').toUpperCase();
    if (asset === 'USDT') return Currency.USDT;
    if (asset === 'USDC') return Currency.USDC;
    return null;
  }

  // --- Gap re-scan (socket was down only; one RPC-heavy call) ---

  async catchUp(): Promise<void> {
    const provider = this.provider;
    if (!provider) return;
    const addresses = this.depositRegistry.addressesForChain('EVM');
    if (addresses.length === 0) return;

    const latest = await provider.getBlockNumber();
    const maxFrom = latest - this.config.evmConfirmations + 1;
    if (maxFrom < 1) return;

    const cursor = await this.prisma.chainCursor.upsert({
      where: { chain: 'EVM' },
      update: {},
      create: { chain: 'EVM', lastBlock: 0, lastBlockHash: null },
    });

    let from = cursor.lastBlock + 1;
    if (from > maxFrom) return;

    const maxBlocks = Math.max(1, this.config.evmCatchUpMaxBlocks);
    const gap = maxFrom - from + 1;
    if (gap > maxBlocks) {
      from = maxFrom - maxBlocks + 1;
      this.logger.warn(
        `EVM catch-up gap exceeds ${maxBlocks} blocks; scanning the most recent ${maxBlocks}`,
      );
    }

    // Throttle redundant re-scans (e.g. reconnect loops). A genuine gap after
    // the socket was down always runs immediately so deposits are not missed.
    const now = Date.now();
    const elapsed =
      this.lastCatchUpAt > 0 ? now - this.lastCatchUpAt : Infinity;
    if (
      !this.socketDown &&
      elapsed < this.config.evmCatchUpMinIntervalMs &&
      gap <= maxBlocks
    ) {
      this.logger.debug(
        `EVM catch-up throttled (${elapsed}ms since last run); live subscription covers recent blocks`,
      );
      return;
    }

    await this.scanTransfers(provider, from, maxFrom, addresses);

    await this.prisma.chainCursor.upsert({
      where: { chain: 'EVM' },
      update: { lastBlock: maxFrom },
      create: { chain: 'EVM', lastBlock: maxFrom, lastBlockHash: null },
    });
    this.catchUpRuns += 1;
    this.lastCatchUpAt = Date.now();
    this.socketDown = false;
    this.logger.log(
      `EVM catch-up complete: scanned blocks ${from}..${maxFrom}`,
    );
  }

  // --- Finalisation (two-stage credit) ---

  /**
   * Finalises PENDING EVM deposits whose block has reached the confirmation
   * depth, crediting the wallet ledger. Gated on there being any known
   * PENDING deposits so no receipt lookups happen in quiet periods.
   *
   * Each candidate is re-verified against the canonical chain (receipt) so a
   * re-org that drops the tx never produces a ledger credit. PENDING rows
   * whose tx no longer exists on the canonical chain are cancelled instead of
   * lingering forever (a definitive block mismatch cancels immediately; a
   * missing receipt is cancelled only on a second consecutive miss to absorb
   * transient RPC hiccups).
   */
  async finalizePendingDeposits(maxFrom: number): Promise<void> {
    const provider = this.provider;
    if (!provider || maxFrom < 1) return;
    await this.loadPendingCache();
    if (this.pendingHashes.size === 0) return;
    const pending = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'EVM_WS' },
      },
      take: 200,
    });
    for (const tx of pending) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const blockNumber =
        typeof meta.blockNumber === 'number' ? meta.blockNumber : NaN;
      if (!Number.isFinite(blockNumber) || blockNumber > maxFrom) continue;
      if (!tx.reference) continue;

      const receipt = await provider.getTransactionReceipt(tx.reference);
      if (receipt && receipt.blockNumber === blockNumber) {
        await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
          confirmations: maxFrom - blockNumber + 1,
          completedAt: new Date().toISOString(),
        });
        this.pendingHashes.delete(tx.reference);
        this.staleReceiptMisses.delete(tx.reference);
        this.logger.log(
          `Deposit finalized: ${tx.amount.toNumber()} ${(meta.asset as string) ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`,
        );
      } else if (receipt && receipt.blockNumber !== blockNumber) {
        await this.cancelPending(tx, blockNumber, 'REORG_DROPPED');
      } else {
        const miss = this.staleReceiptMisses.get(tx.reference) ?? 0;
        this.staleReceiptMisses.set(tx.reference, miss + 1);
        if (miss + 1 >= 2) {
          await this.cancelPending(tx, blockNumber, 'RECEIPT_MISSING');
        }
      }
    }
  }

  private async loadPendingCache(): Promise<void> {
    if (this.pendingCacheLoaded) return;
    const pendings = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'EVM_WS' },
      },
      select: { reference: true },
      take: 500,
    });
    for (const p of pendings) {
      if (p.reference) this.pendingHashes.add(p.reference);
    }
    this.pendingCacheLoaded = true;
  }

  private async cancelPending(
    tx: {
      id: string;
      amount: { toNumber: () => number };
      reference: string | null;
      walletId: string;
    },
    blockNumber: number,
    reason: string,
  ): Promise<void> {
    if (!tx.reference) return;
    await this.walletService.updateTransactionStatus(tx.id, 'CANCELLED', {
      finalization: reason,
      cancelledAt: new Date().toISOString(),
    });
    this.pendingHashes.delete(tx.reference);
    this.staleReceiptMisses.delete(tx.reference);
    this.logger.warn(
      `Deposit cancelled (${reason}): ${tx.reference} (was block ${blockNumber})`,
    );
  }

  // --- Shared recording ---

  private async recordPending(params: {
    address: string;
    currency: Currency;
    amount: number;
    txHash: string;
    sourceAddress: string | null;
    blockNumber: number;
  }): Promise<void> {
    const { address, currency, amount, txHash, sourceAddress, blockNumber } =
      params;

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: txHash },
    });
    if (existing) return;

    const registrations = this.depositRegistry.lookup(address, 'EVM');
    if (registrations.length === 0) return;

    for (const reg of registrations) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: reg.walletId },
      });
      if (!wallet || wallet.currency !== currency) continue;

      try {
        await this.walletService.createTransaction({
          walletId: wallet.id,
          type: LedgerType.DEPOSIT,
          amount,
          reference: txHash,
          status: 'PENDING',
          metadata: {
            source: 'EVM_WS',
            listener: 'EVM_WS',
            blockTxId: txHash,
            asset: currency,
            address,
            sourceAddress,
            blockNumber,
            confirmations: 0,
            receivedAt: new Date().toISOString(),
          },
        });
        this.depositsDetected += 1;
        this.pendingHashes.add(txHash);
        this.logger.log(
          `Deposit detected (pending): ${amount} ${currency} to wallet ${wallet.id} (TX: ${txHash}, block ${blockNumber})`,
        );
      } catch (error) {
        const err = error as ErrorLike;
        if (err.code === 'P2002') {
          this.logger.debug(
            `Deposit ${txHash} already recorded for wallet ${wallet.id}; skipping`,
          );
        } else {
          this.logger.error(
            `Failed to record deposit ${txHash} for wallet ${wallet.id}: ${err.message}`,
          );
        }
      }
    }
  }
}
