import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { WebhookProcessorService } from './webhook-processor.service';
import type { NormalizedCryptoEvent } from './webhook-processor.service';
import { Currency } from '@src/generated/client';

interface ErrorLike {
  message?: string;
}

/** A single TRC-20 transfer returned by TronGrid's account trc20 endpoint. */
interface TronTrc20Transfer {
  transaction_id: string;
  block_timestamp: number;
  from: string;
  to: string;
  value: string;
  token_info?: { address?: string };
  type?: string;
}

interface TronTrc20Response {
  data?: TronTrc20Transfer[];
}

/**
 * Scheduled TRON TRC-20 deposit poller.
 *
 * TRON does not use push webhooks (it is polled per the plan). On a cron
 * schedule it queries TronGrid's account `transactions/trc20` endpoint for each
 * active TRON deposit address, normalizes inbound USDT/USDC transfers into
 * `NormalizedCryptoEvent`s, and hands them to WebhookProcessorService for
 * idempotent deposit crediting (dedup on `WalletTransaction.reference = txHash`).
 * A ChainCursor row for 'TRON' tracks breadth-first progress by block timestamp.
 */
@Injectable()
export class TronDepositPollerService implements OnModuleInit {
  private readonly logger = new Logger(TronDepositPollerService.name);
  private isRunning = false;

  private static readonly JOB_NAME = 'tron_deposit_poller';

  constructor(
    private readonly httpService: HttpService,
    private readonly config: CryptoConfigService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly prisma: PrismaService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cronExpression = this.config.tronPollCronSchedule;
    const job = new CronJob(cronExpression, () => {
      void this.pollTronDeposits();
    });
    this.schedulerRegistry.addCronJob(TronDepositPollerService.JOB_NAME, job);
    job.start();
    this.logger.log(`TRON deposit poller cron scheduled: ${cronExpression}`);
  }

  /** Single poll cycle: query TRC-20 transfers and process inbound deposits. */
  async pollTronDeposits(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('TRON poll already in progress; skipping');
      return;
    }
    this.isRunning = true;
    try {
      const addresses = this.depositRegistry.addressesForChain('TRON');
      if (addresses.length === 0) {
        this.logger.debug('No active TRON deposit addresses to poll');
        return;
      }

      const active = new Set(addresses.map((a) => a.toLowerCase()));
      const cursor = await this.getCursor();

      for (const currency of [Currency.USDT, Currency.USDC]) {
        const contract = this.config.getStablecoinContractFor('TRON', currency);
        if (!contract) continue;
        const transfers = await this.queryTrc20Transfers(
          contract,
          active,
          cursor.lastPolledAt,
        );
        for (const transfer of transfers) {
          const event = this.normalize(transfer, contract, currency);
          if (!event) continue;
          await this.webhookProcessor.processEvent(event);
        }
        // Advance cursor past the newest transfer timestamp seen for this token.
        const lastTs = transfers.reduce(
          (max, t) => Math.max(max, t.block_timestamp),
          cursor.lastPolledAt,
        );
        if (lastTs > cursor.lastPolledAt) {
          await this.prisma.chainCursor.upsert({
            where: { chain: 'TRON' },
            update: { lastBlock: Math.floor(lastTs / 1000) },
            create: { chain: 'TRON', lastBlock: Math.floor(lastTs / 1000) },
          });
        }
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`TRON deposit poll failed: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /** Reads the persisted TRON poll cursor (epoch seconds) or defaults to now. */
  private async getCursor(): Promise<{ lastPolledAt: number }> {
    const row = await this.prisma.chainCursor.findUnique({
      where: { chain: 'TRON' },
    });
    if (row && row.lastBlock > 0) {
      return { lastPolledAt: row.lastBlock * 1000 };
    }
    // Default: only look back 24h on the first run to bound the query.
    return { lastPolledAt: Date.now() - 24 * 60 * 60 * 1000 };
  }

  /**
   * Queries TronGrid's account `transactions/trc20` endpoint for each active
   * deposit address, filtering to inbound transfers of the given token after
   * `minTimestamp`. Returns a merged, deduplicated list.
   */
  private async queryTrc20Transfers(
    contract: string,
    active: Set<string>,
    minTimestamp: number,
  ): Promise<TronTrc20Transfer[]> {
    const baseUrl = this.config.httpUrlForChain('TRON');
    if (!baseUrl) {
      this.logger.warn('ALCHEMY_TRON_HTTP_URL not configured; skipping poll');
      return [];
    }
    const seen = new Set<string>();
    const out: TronTrc20Transfer[] = [];
    const lowerContract = contract.toLowerCase();

    for (const address of active) {
      try {
        // TronGrid v1 is served alongside the JSON-RPC host (Alchemy TRON).
        const url = `${baseUrl.replace(/\/+$/, '')}/v1/accounts/${address}/transactions/trc20`;
        const res = await lastValueFrom(
          this.httpService.get<TronTrc20Response>(url, {
            params: {
              contract_address: contract,
              min_timestamp: minTimestamp,
              limit: 200,
            },
            timeout: 20_000,
          }),
        );
        const data = Array.isArray(res.data?.data) ? res.data!.data! : [];
        for (const tx of data) {
          if (tx.type !== 'Transfer') continue;
          const txContract = (tx.token_info?.address || '').toLowerCase();
          if (txContract && txContract !== lowerContract) continue;
          const to = (tx.to || '').toLowerCase();
          if (!active.has(to)) continue;
          if (seen.has(tx.transaction_id)) continue;
          seen.add(tx.transaction_id);
          out.push(tx);
        }
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.warn(
          `TRON trc20 query failed for ${address}: ${err.message}`,
        );
      }
    }
    return out;
  }

  /** Converts a TronGrid TRC-20 transfer into a normalized deposit event. */
  private normalize(
    tx: TronTrc20Transfer,
    contract: string,
    currency: Currency,
  ): NormalizedCryptoEvent | null {
    if (!tx.transaction_id) return null;
    const value = Number(tx.value ?? 0) / 1e6;
    if (!Number.isFinite(value) || value <= 0) return null;
    const blockTimestamp = Math.floor((tx.block_timestamp || 0) / 1000);
    return {
      provider: 'tron_poller',
      chain: 'TRON',
      family: 'TRON',
      direction: 'INBOUND',
      txHash: tx.transaction_id,
      fromAddress: tx.from || '',
      toAddress: tx.to || '',
      asset: currency,
      amount: value,
      blockNumber: blockTimestamp,
      logIndex: undefined,
    };
  }
}
