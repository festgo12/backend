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
  formatEther,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

const TRANSFER_TOPIC = keccak256(
  toUtf8Bytes('Transfer(address,address,uint256)'),
);
const STABLECOIN_DECIMALS = 6;
const RECENT_HASHES_MAX = 2048;
const CATCH_UP_MAX_BLOCKS = 200;
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
 *    (push, ~0 CU) - no polling and no alchemy_getAssetTransfers.
 *  - Native ETH: `newHeads` subscription, then the block body is scanned for
 *    transfers into registered addresses (push; one eth_getBlockByNumber per
 *    block - not billed at getAssetTransfers rates).
 *  - Confirmation depth: deposits are recorded PENDING on detection and only
 *    finalised (ledger credit) once the block reaches evmConfirmations.
 *  - Reconnect: ethers' WebSocketProvider does not auto-reconnect, so a
 *    failed socket triggers a reconnect loop with backoff. After every
 *    (re)connect the gap since the last cursor is re-scanned with eth_getLogs
 *    for tokens and block scans for native ETH - the ONLY RPC-heavy path.
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
  private reconnectAttempts = 0;
  private connecting = false;
  private processingBlock = false;
  private pendingBlocks = new Set<number>();
  private recentHashes = new Map<number, string>();
  private cursorLastBlock = 0;
  private cursorLastBlockHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly config: CryptoConfigService,
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
        void this.drainBlocks();
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
      await this.catchUp();
      const latest = await provider.getBlockNumber();
      await this.finalizePendingDeposits(
        latest - this.config.evmConfirmations + 1,
      );
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

  private teardown(clearReconnect = true): void {
    if (clearReconnect && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
    if (log.removed || !log.topics?.[2]) return;
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

  private async drainBlocks(): Promise<void> {
    if (this.processingBlock) return;
    this.processingBlock = true;
    try {
      while (this.pendingBlocks.size > 0) {
        const next = Math.min(...this.pendingBlocks);
        this.pendingBlocks.delete(next);
        await this.handleBlock(next);
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`EVM block handler failed: ${err.message}`);
    } finally {
      this.processingBlock = false;
    }
  }

  private async handleBlock(blockNumber: number): Promise<void> {
    const provider = this.provider;
    if (!provider) return;
    this.latestBlock = blockNumber;
    const required = this.config.evmConfirmations;
    const maxFrom = blockNumber - required + 1;

    if (maxFrom > 0) {
      await this.finalizePendingDeposits(maxFrom);
    }

    const addresses = this.depositRegistry.addressesForChain('EVM');
    if (addresses.length === 0) return;

    const block = await provider.getBlock(blockNumber, true);
    if (!block) return;

    if (block.hash) this.recentHashes.set(blockNumber, block.hash);
    if (this.recentHashes.size > RECENT_HASHES_MAX) {
      const oldest = Math.min(...this.recentHashes.keys());
      this.recentHashes.delete(oldest);
    }

    // Re-org detection on the confirmed boundary.
    const prevHash = this.recentHashes.get(blockNumber - 1);
    const boundaryHash = this.recentHashes.get(maxFrom);
    const reorged =
      (prevHash && block.parentHash !== prevHash) ||
      (this.cursorLastBlockHash &&
        boundaryHash &&
        boundaryHash !== this.cursorLastBlockHash);
    if (reorged) {
      this.logger.warn(
        `EVM re-org detected near block ${blockNumber}; rewinding for catch-up`,
      );
      await this.rewindForCatchUp(maxFrom);
      await this.catchUp();
      return;
    }

    // Native ETH deposits into registered addresses.
    const addressSet = new Set(addresses.map((a) => a.toLowerCase()));
    const txs = block.prefetchedTransactions;
    for (const tx of txs) {
      if (!tx.to || !addressSet.has(tx.to.toLowerCase())) continue;
      const amount = Number(formatEther(tx.value));
      if (!Number.isFinite(amount) || amount <= 0) continue;
      await this.recordPending({
        address: tx.to.toLowerCase(),
        currency: Currency.ETH,
        amount,
        txHash: tx.hash,
        sourceAddress: tx.from || null,
        blockNumber,
      });
    }

    if (maxFrom > this.cursorLastBlock) {
      await this.prisma.chainCursor.upsert({
        where: { chain: 'EVM' },
        update: { lastBlock: maxFrom, lastBlockHash: boundaryHash ?? null },
        create: {
          chain: 'EVM',
          lastBlock: maxFrom,
          lastBlockHash: boundaryHash ?? null,
        },
      });
      this.cursorLastBlock = maxFrom;
      this.cursorLastBlockHash = boundaryHash ?? null;
    }
  }

  // --- Gap re-scan (reconnect only; the only RPC-heavy path) ---

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
    if (maxFrom - from + 1 > CATCH_UP_MAX_BLOCKS) {
      from = maxFrom - CATCH_UP_MAX_BLOCKS + 1;
      this.logger.warn(
        `EVM catch-up gap exceeds ${CATCH_UP_MAX_BLOCKS} blocks; scanning the most recent ${CATCH_UP_MAX_BLOCKS}`,
      );
    }

    const addressSet = new Set(addresses.map((a) => a.toLowerCase()));

    // ERC-20 USDT/USDC via eth_getLogs (~60 CU per contract call).
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
      const logs = await provider.getLogs({
        fromBlock: from,
        toBlock: maxFrom,
        address: address.toLowerCase(),
        topics: [TRANSFER_TOPIC],
      });
      for (const log of logs) {
        if (log.removed || !log.topics?.[2]) continue;
        const to = '0x' + log.topics[2].slice(26).toLowerCase();
        if (!addressSet.has(to)) continue;
        const amount = Number(
          formatUnits(BigInt(log.data), STABLECOIN_DECIMALS),
        );
        if (!Number.isFinite(amount) || amount <= 0) continue;
        await this.recordPending({
          address: to,
          currency,
          amount,
          txHash: log.transactionHash,
          sourceAddress: log.topics[1]
            ? '0x' + log.topics[1].slice(26).toLowerCase()
            : null,
          blockNumber: log.blockNumber,
        });
      }
    }

    // Native ETH by scanning confirmed blocks.
    for (let b = from; b <= maxFrom; b++) {
      const block = await provider.getBlock(b, true);
      if (!block) continue;
      const txs = block.prefetchedTransactions;
      for (const tx of txs) {
        if (!tx.to || !addressSet.has(tx.to.toLowerCase())) continue;
        const amount = Number(formatEther(tx.value));
        if (!Number.isFinite(amount) || amount <= 0) continue;
        await this.recordPending({
          address: tx.to.toLowerCase(),
          currency: Currency.ETH,
          amount,
          txHash: tx.hash,
          sourceAddress: tx.from || null,
          blockNumber: b,
        });
      }
    }

    await this.prisma.chainCursor.upsert({
      where: { chain: 'EVM' },
      update: { lastBlock: maxFrom },
      create: { chain: 'EVM', lastBlock: maxFrom, lastBlockHash: null },
    });
    this.catchUpRuns += 1;
    this.logger.log(
      `EVM catch-up complete: scanned blocks ${from}..${maxFrom}`,
    );
  }

  private async rewindForCatchUp(maxFrom: number): Promise<void> {
    this.cursorLastBlock = 0;
    this.cursorLastBlockHash = null;
    this.recentHashes.clear();
    await this.prisma.chainCursor.upsert({
      where: { chain: 'EVM' },
      update: { lastBlock: Math.max(0, maxFrom - 1) },
      create: {
        chain: 'EVM',
        lastBlock: Math.max(0, maxFrom - 1),
        lastBlockHash: null,
      },
    });
  }

  // --- Finalisation (two-stage credit) ---

  /**
   * Finalises PENDING EVM deposits whose block has reached the confirmation
   * depth, crediting the wallet ledger. Idempotent - the PENDING row was
   * created with a unique tx reference, and this pass only flips status.
   * Each candidate is re-verified against the canonical chain (receipt) so
   * a re-org that drops the tx never produces a ledger credit.
   */
  async finalizePendingDeposits(maxFrom: number): Promise<void> {
    const provider = this.provider;
    if (!provider || maxFrom < 1) return;
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
      if (!receipt || receipt.blockNumber !== blockNumber) continue;

      await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
        confirmations: maxFrom - blockNumber + 1,
        completedAt: new Date().toISOString(),
      });
      this.logger.log(
        `Deposit finalized: ${tx.amount.toNumber()} ${(meta.asset as string) ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`,
      );
    }
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
