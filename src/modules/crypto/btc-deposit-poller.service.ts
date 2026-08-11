import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  code?: string;
}

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Local-first BTC inbound deposit poller. mempool.space has no push
 * subscription, so each registered bech32 address is polled for confirmed
 * utxos on a low-frequency schedule (every 2 minutes). Deposits are credited
 * COMPLETED only once they reach the BTC confirmation threshold, so ledger
 * entries are final.
 */
@Injectable()
export class BtcDepositPollerService {
  private readonly logger = new Logger(BtcDepositPollerService.name);
  private isRunning = false;
  private nextPollAllowedAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly chainClient: ChainClientService,
    private readonly config: CryptoConfigService,
  ) {}

  @Cron('0 */2 * * * *')
  async scan(): Promise<void> {
    if (!this.config.isAlchemy || this.isRunning) return;
    if (Date.now() < this.nextPollAllowedAt) return;
    this.isRunning = true;
    try {
      const addresses = this.depositRegistry.addressesForChain('BTC');
      if (addresses.length === 0) return;

      const tip = await this.chainClient.getBtcTipHeight();
      if (!tip) return;
      const required = this.config.btcConfirmations;

      for (const address of addresses) {
        const utxos = await this.chainClient.getBtcUtxos(address);
        for (const utxo of utxos) {
          const confirmations = tip - utxo.blockHeight + 1;
          if (confirmations < required) continue;
          await this.creditDeposit({
            address,
            currency: Currency.BTC,
            amount: utxo.value / 1e8,
            txHash: utxo.txid,
            sourceAddress: null,
            confirmations,
          });
        }
      }
    } catch (error) {
      const err = error as ErrorLike;
      const message = err.message || 'unknown error';
      if (/status=429|Too many requests|rate.?limit/i.test(message)) {
        this.nextPollAllowedAt = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        this.logger.warn(
          `BTC deposit poll rate-limited; backing off for ${RATE_LIMIT_COOLDOWN_MS / 1000}s`,
        );
      } else {
        const stack = (error as { stack?: string })?.stack;
        this.logger.error(
          `BTC deposit poll failed: ${message}${stack ? `\n${stack}` : ''}`,
        );
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Records a confirmed BTC deposit for every registered wallet that owns the
   * address. Idempotent on the tx hash (unique reference on WalletTransaction).
   */
  async creditDeposit(params: {
    address: string;
    currency: Currency;
    amount: number;
    txHash: string;
    sourceAddress: string | null;
    confirmations: number;
  }): Promise<void> {
    const { address, currency, amount, txHash, sourceAddress, confirmations } =
      params;

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: txHash },
    });
    if (existing) return;

    const registrations = this.depositRegistry.lookup(address, 'BTC');
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
          status: 'COMPLETED',
          metadata: {
            source: 'MEMPOOL_POLLER',
            listener: 'BTC_POLLER',
            blockTxId: txHash,
            asset: currency,
            address,
            sourceAddress,
            confirmations,
            receivedAt: new Date().toISOString(),
          },
        });
        this.logger.log(
          `Deposit credited: ${amount} ${currency} to wallet ${wallet.id} (TX: ${txHash})`,
        );
      } catch (error) {
        const err = error as ErrorLike;
        if (err.code === 'P2002') {
          this.logger.debug(
            `Deposit ${txHash} already recorded for wallet ${wallet.id}; skipping`,
          );
        } else {
          this.logger.error(
            `Failed to credit deposit ${txHash} to wallet ${wallet.id}: ${err.message}`,
          );
        }
      }
    }
  }
}
