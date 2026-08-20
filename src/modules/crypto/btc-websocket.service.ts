import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import WebSocket from 'ws';
import { CryptoConfigService } from './crypto-config.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';

interface BtcTxVin {
  n: number;
  addresses?: string[];
  isAddress?: boolean;
  value: string;
}

interface BtcTxVout {
  value: string;
  n: number;
  addresses?: string[];
  isAddress?: boolean;
}

interface BtcTx {
  txid: string;
  vin: BtcTxVin[];
  vout: BtcTxVout[];
  blockHeight: number;
  confirmations: number;
  value: string;
  valueIn: string;
  fees: string;
}

interface WsResponse {
  id: string;
  data?: { subscribed?: boolean; address?: string; tx?: BtcTx };
  error?: { message: string };
}

interface NormalizedBtcEvent {
  provider: 'btc_websocket';
  chain: 'BTC';
  direction: 'INBOUND' | 'OUTBOUND';
  txHash: string;
  fromAddress: string;
  toAddress: string;
  asset: 'BTC';
  amount: number;
  blockNumber: number;
}

/**
 * Manages a persistent WebSocket connection to Alchemy's Bitcoin endpoint,
 * using `subscribeAddresses` to detect deposits and withdrawals in real time.
 *
 * Key behaviors:
 * - Maintains an in-memory array of all monitored derived child addresses.
 * - Sends `subscribeAddresses` with the full array on connect and reconnect.
 * - When a new BTC address is derived, appends it and re-subscribes
 *   (Alchemy replaces the previous subscription).
 * - Parses incoming transaction data and forwards matching events to
 *   WebhookProcessorService for idempotent processing.
 */
@Injectable()
export class BtcAlchemyWebSocketService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(BtcAlchemyWebSocketService.name);
  private ws: WebSocket | null = null;
  private monitoredAddresses: string[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private subscriptionId = 'sub_btc_1';

  private static readonly MAX_BACKOFF_MS = 30_000;
  private static readonly INITIAL_BACKOFF_MS = 1_000;

  constructor(
    private readonly cryptoConfig: CryptoConfigService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly depositRegistry: DepositAddressRegistry,
  ) {}

  onModuleInit() {
    // Load all existing BTC addresses from the registry
    this.monitoredAddresses = this.depositRegistry.addressesForChain('BTC');
    this.logger.log(
      `BTC WebSocket: loaded ${this.monitoredAddresses.length} monitored addresses from registry`,
    );

    if (this.monitoredAddresses.length > 0) {
      this.connect();
    } else {
      this.logger.warn(
        'BTC WebSocket: no BTC addresses in registry; connection deferred until first address is registered',
      );
    }
  }

  // ─── Connection Management ──────────────────────────────────────────────

  private connect() {
    const wsUrl = this.cryptoConfig.alchemyBtcWsUrl;
    if (!wsUrl) {
      this.logger.error('ALCHEMY_BTC_WS_URL is not configured; cannot connect');
      return;
    }

    if (this.ws) {
      this.cleanupSocket();
    }

    this.logger.log(`BTC WebSocket: connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.on('open', () => {
      this.logger.log('BTC WebSocket: connected');
      this.reconnectAttempts = 0;
      this.resubscribe();
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString()) as WsResponse;
        this.handleMessage(msg);
      } catch (error) {
        const err = error as Error;
        this.logger.debug(
          `BTC WebSocket: failed to parse message: ${err.message}`,
        );
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.logger.warn(
        `BTC WebSocket: closed (code=${code}, reason=${reason.toString()})`,
      );
      this.ws = null;
      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });

    ws.on('error', (error: Error) => {
      this.logger.error(`BTC WebSocket: error — ${error.message}`);
      // 'close' event will follow; reconnect is handled there
    });
  }

  private cleanupSocket() {
    if (!this.ws) return;
    try {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
    } catch {
      // ignore cleanup errors
    }
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.isShuttingDown || this.reconnectTimer) return;

    const delay = Math.min(
      BtcAlchemyWebSocketService.INITIAL_BACKOFF_MS *
        Math.pow(2, this.reconnectAttempts),
      BtcAlchemyWebSocketService.MAX_BACKOFF_MS,
    );
    this.reconnectAttempts++;

    this.logger.log(
      `BTC WebSocket: reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // ─── Subscription ──────────────────────────────────────────────────────

  private resubscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (this.monitoredAddresses.length === 0) {
      this.logger.debug('BTC WebSocket: no addresses to subscribe');
      return;
    }

    const payload = {
      id: this.subscriptionId,
      method: 'subscribeAddresses',
      params: {
        addresses: [...this.monitoredAddresses],
        newBlockTxs: true,
      },
    };

    this.ws.send(JSON.stringify(payload));
    this.logger.log(
      `BTC WebSocket: subscribed to ${this.monitoredAddresses.length} addresses`,
    );
  }

  // ─── Address Management ─────────────────────────────────────────────────

  /**
   * Adds a new BTC address to the monitored set and re-subscribes.
   * Alchemy replaces the previous subscription with the updated list.
   */
  addAddress(address: string) {
    if (this.monitoredAddresses.includes(address)) return;
    this.monitoredAddresses.push(address);
    this.logger.log(
      `BTC WebSocket: added address ${address} (${this.monitoredAddresses.length} total)`,
    );
    this.resubscribe();
  }

  /** Remove an address from monitoring. */
  removeAddress(address: string) {
    const idx = this.monitoredAddresses.indexOf(address);
    if (idx === -1) return;
    this.monitoredAddresses.splice(idx, 1);
    this.logger.log(
      `BTC WebSocket: removed address ${address} (${this.monitoredAddresses.length} total)`,
    );
    this.resubscribe();
  }

  /** Force a re-subscribe (e.g., after a bulk registry rebuild). */
  refreshAll() {
    this.monitoredAddresses = this.depositRegistry.addressesForChain('BTC');
    this.resubscribe();
  }

  // ─── Message Handling ──────────────────────────────────────────────────

  private handleMessage(msg: WsResponse) {
    // Subscription confirmation
    if (msg.data?.subscribed === true) {
      this.logger.debug(`BTC WebSocket: subscription confirmed (id=${msg.id})`);
      return;
    }

    // Subscription error
    if (msg.error) {
      this.logger.error(
        `BTC WebSocket: subscription error — ${msg.error.message}`,
      );
      return;
    }

    // Transaction event
    if (msg.data?.tx && msg.data?.address) {
      void this.processTransaction(msg.data.address, msg.data.tx);
    }
  }

  private async processTransaction(matchedAddress: string, tx: BtcTx) {
    try {
      const event = this.normalizeTx(matchedAddress, tx);
      if (!event) return;

      await this.webhookProcessor.processBtcEvent(event);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `BTC WebSocket: failed to process tx ${tx.txid}: ${err.message}`,
      );
    }
  }

  private normalizeTx(
    matchedAddress: string,
    tx: BtcTx,
  ): NormalizedBtcEvent | null {
    if (!tx || !tx.txid) return null;

    const vinAddresses = this.extractAddresses(tx.vin);
    const voutAddresses = this.extractAddresses(tx.vout);

    // Check direction: is the matched address in vin (sender) or vout (receiver)?
    const isSender = vinAddresses.includes(matchedAddress);
    const isReceiver = voutAddresses.includes(matchedAddress);

    if (!isSender && !isReceiver) return null;

    // BTC amount: use the value field (in BTC) or compute from valueIn/value
    const amountBtc = this.parseBtcAmount(tx.value, tx.vin, tx.vout);

    const blockNumber = tx.blockHeight > 0 ? tx.blockHeight : 0;

    if (isReceiver) {
      // INBOUND: find the external sender (first vin address not in our set)
      const fromAddr =
        vinAddresses.find((a) => !this.isMonitoredAddress(a)) ||
        vinAddresses[0] ||
        '';
      return {
        provider: 'btc_websocket',
        chain: 'BTC',
        direction: 'INBOUND',
        txHash: tx.txid,
        fromAddress: fromAddr,
        toAddress: matchedAddress,
        asset: 'BTC',
        amount: amountBtc,
        blockNumber,
      };
    }

    // OUTBOUND: we are the sender
    const toAddr =
      voutAddresses.find((a) => !this.isMonitoredAddress(a)) ||
      voutAddresses[0] ||
      '';
    return {
      provider: 'btc_websocket',
      chain: 'BTC',
      direction: 'OUTBOUND',
      txHash: tx.txid,
      fromAddress: matchedAddress,
      toAddress: toAddr,
      asset: 'BTC',
      amount: amountBtc,
      blockNumber,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private extractAddresses(items: Array<{ addresses?: string[] }>): string[] {
    const addrs: string[] = [];
    for (const item of items) {
      if (Array.isArray(item.addresses)) {
        addrs.push(...item.addresses);
      }
    }
    return addrs;
  }

  private isMonitoredAddress(address: string): boolean {
    return this.monitoredAddresses.includes(address);
  }

  /**
   * Parse BTC amount from the transaction. The value field may be in BTC
   * (string like "1.5") or the vout values may be in satoshis.
   */
  private parseBtcAmount(
    txValue: string,
    vin: BtcTxVin[],
    vout: BtcTxVout[],
  ): number {
    // Prefer the top-level value field (in BTC)
    const parsed = parseFloat(txValue);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;

    // Fallback: sum vout values (may be in satoshis)
    const totalVout = vout.reduce(
      (sum, o) => sum + parseFloat(o.value || '0'),
      0,
    );
    if (totalVout > 10000) {
      // Looks like satoshis
      return totalVout / 1e8;
    }
    return totalVout;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  onApplicationShutdown() {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
    this.logger.log('BTC WebSocket: shutdown complete');
  }
}
