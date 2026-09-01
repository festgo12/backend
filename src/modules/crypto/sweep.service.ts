import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService, MASTER_WALLET_INDEX } from './hd-wallet.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message: string;
}

export interface SweepRunSummary {
  evmSwept: number;
  btcSwept: number;
  evmSkipped: number;
  btcSkipped: number;
  errors: string[];
}

/**
 * Consolidates confirmed on-chain balances from user deposit addresses into
 * the platform master wallet once they reach DEPOSIT_SWEEP_THRESHOLD (in USD).
 * Enabled only when the threshold is > 0 (the default of 0 keeps funds at
 * user addresses so user-sourced withdrawals continue to work). Each sweep
 * is recorded as a DEPOSIT on the platform wallet and tracked by the
 * withdrawal queue. ERC-20 sweeps require ETH at the source address for gas;
 * failures are logged and retried on the next run.
 */
@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly chainClient: ChainClientService,
    private readonly config: CryptoConfigService,
    private readonly hdWallet: HdWalletService,
    private readonly tracker: WithdrawalTrackerService,
    private readonly platformService: PlatformService,
    private readonly exchangeRate: ExchangeRateService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepAll() {
    if (this.isRunning) return;
    if (this.config.depositSweepThreshold <= 0) return;
    try {
      await this.runSweep();
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`Sweep run failed: ${err.message}`);
    }
  }

  /**
   * Manual sweep — triggered via admin endpoint.
   * Respects DEPOSIT_SWEEP_THRESHOLD; sweeps all qualifying deposit
   * addresses into the platform master wallet. Returns a summary.
   */
  async manualSweepAll(): Promise<SweepRunSummary> {
    if (this.isRunning) {
      throw new Error('Sweep already in progress');
    }
    try {
      return await this.runSweep();
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`Manual sweep run failed: ${err.message}`);
      throw error;
    }
  }

  /** Shared sweep execution guarded by the running mutex. */
  private async runSweep(): Promise<SweepRunSummary> {
    if (this.isRunning) {
      throw new Error('Sweep already in progress');
    }
    this.isRunning = true;
    try {
      const evm = await this.sweepEvm();
      const btc = await this.sweepBtc();
      return {
        evmSwept: evm.swept,
        btcSwept: btc.swept,
        evmSkipped: evm.skipped,
        btcSkipped: btc.skipped,
        errors: [...evm.errors, ...btc.errors],
      };
    } finally {
      this.isRunning = false;
    }
  }

  private async sweepEvm(): Promise<{
    swept: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { swept: 0, skipped: 0, errors: [] as string[] };
    const addresses = this.depositRegistry.addressesForChain('EVM');
    if (addresses.length === 0) return result;
    const thresholdUsd = this.config.depositSweepThreshold;

    for (const address of addresses) {
      const registrations = this.depositRegistry.lookup(address, 'EVM');
      const seen = new Set<Currency>();
      for (const reg of registrations) {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: reg.walletId },
        });
        if (!wallet || seen.has(wallet.currency)) continue;
        seen.add(wallet.currency);

        // Index 0 is the platform master/fee wallet — never sweep it to itself.
        if (
          wallet.derivationIndex === null ||
          wallet.derivationIndex === MASTER_WALLET_INDEX
        ) {
          result.skipped += 1;
          continue;
        }
        const balance = await this.chainClient.getEvmBalance(
          address,
          wallet.currency,
        );
        const balanceUsd = this.exchangeRate.convertToUsd(
          balance,
          wallet.currency,
        );
        if (balanceUsd < thresholdUsd) continue;

        this.logger.log(
          `EVM sweep candidate: ${balance} ${wallet.currency} (~$${balanceUsd.toFixed(2)}) ≥ $${thresholdUsd}`,
        );
        await this.sweepEvmCurrency(
          wallet.currency,
          wallet.derivationIndex,
          address,
          balance,
          result,
        );
      }
    }
    return result;
  }

  private async sweepBtc(): Promise<{
    swept: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { swept: 0, skipped: 0, errors: [] as string[] };
    const addresses = this.depositRegistry.addressesForChain('BTC');
    if (addresses.length === 0) return result;
    const thresholdUsd = this.config.depositSweepThreshold;

    for (const address of addresses) {
      const registrations = this.depositRegistry.lookup(address, 'BTC');
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: registrations[0]?.walletId || '' },
      });

      // Index 0 is the platform master/fee wallet — never sweep it to itself.
      if (
        !wallet ||
        wallet.derivationIndex === null ||
        wallet.derivationIndex === MASTER_WALLET_INDEX
      ) {
        result.skipped += 1;
        continue;
      }

      const utxos = await this.chainClient.getBtcUtxos(address);
      const balance = utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
      const balanceUsd = this.exchangeRate.convertToUsd(balance, Currency.BTC);
      if (balanceUsd < thresholdUsd) continue;

      this.logger.log(
        `BTC sweep candidate: ${balance} BTC (~$${balanceUsd.toFixed(2)}) ≥ $${thresholdUsd}`,
      );
      try {
        const feePerByte = await this.chainClient.getBtcRecommendedFee();
        const txid = await this.chainClient.broadcastBtc(
          wallet.derivationIndex,
          this.hdWallet.getMasterAddress('BTC'),
          balance,
          feePerByte,
        );
        await this.recordSweep(Currency.BTC, balance, txid, address);
        result.swept += 1;
      } catch (error) {
        const err = error as ErrorLike;
        result.errors.push(`BTC ${address}: ${err.message}`);
        this.logger.error(`BTC sweep failed for ${address}: ${err.message}`);
      }
    }
    return result;
  }

  private async sweepEvmCurrency(
    currency: Currency,
    derivationIndex: number,
    fromAddress: string,
    balance: number,
    result: { swept: number; skipped: number; errors: string[] },
  ): Promise<void> {
    const to = this.hdWallet.getMasterAddress('EVM');
    try {
      const txHash =
        currency === Currency.ETH
          ? await this.chainClient.broadcastEvmNative(
              derivationIndex,
              to,
              balance,
            )
          : await this.chainClient.broadcastEvmToken(
              currency,
              derivationIndex,
              to,
              balance,
            );

      const wallet = await this.prisma.wallet.findFirst({
        where: { address: fromAddress, currency, derivationIndex },
      });
      if (wallet) {
        await this.recordSweep(currency, balance, txHash, fromAddress);
        result.swept += 1;
      } else {
        result.errors.push(
          `EVM ${currency} ${fromAddress}: source wallet not found; sweep not recorded`,
        );
      }
    } catch (error) {
      const err = error as ErrorLike;
      result.errors.push(`EVM ${currency} ${fromAddress}: ${err.message}`);
      this.logger.error(
        `EVM sweep failed for ${fromAddress} (${currency}): ${err.message}`,
      );
    }
  }

  private async recordSweep(
    currency: Currency,
    amount: number,
    txHash: string,
    fromAddress: string,
  ): Promise<void> {
    const chain = currency === Currency.BTC ? 'BTC' : 'EVM';
    const destination = this.hdWallet.getMasterAddress(chain);

    // Credit the platform wallet (index 0) — sweep is a DEPOSIT to the master wallet
    const platformWallet =
      await this.platformService.getPlatformFeeWallet(currency);
    if (!platformWallet) {
      throw new Error(`Platform fee wallet not found for ${currency}`);
    }

    await this.prisma.walletTransaction.create({
      data: {
        walletId: platformWallet.id,
        type: LedgerType.DEPOSIT,
        amount,
        status: 'PENDING',
        reference: txHash,
        metadata: {
          destination,
          blockchain: chain,
          provider: 'alchemy',
          sweep: true,
          fromAddress,
          initiatedAt: new Date().toISOString(),
        },
      },
    });
    await this.tracker.enqueue({
      txHash,
      walletId: platformWallet.id,
      currency,
      amount,
      destination,
      metadata: { source: 'DEPOSIT_SWEEP' },
    });

    // Mark matching user deposit transactions as swept and link the sweep tx.
    await this.markMatchedDepositsSwept(currency, fromAddress, txHash);
  }

  /**
   * Flags the user DEPOSIT transactions that funded a swept address as swept,
   * linking the sweep transaction hash. This is how depositors know their funds
   * were consolidated to the platform master wallet.
   */
  private async markMatchedDepositsSwept(
    currency: Currency,
    fromAddress: string,
    sweepTxHash: string,
  ): Promise<void> {
    if (!fromAddress) return;

    const normalized =
      currency === Currency.BTC ? fromAddress : fromAddress.toLowerCase();
    const deposits = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.DEPOSIT,
        wallet: { currency },
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    const sweptAt = new Date().toISOString();
    for (const tx of deposits) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      if (meta.swept === true) continue;
      const txAddress = meta.address as string | undefined;
      if (!txAddress) continue;
      const match =
        currency === Currency.BTC
          ? txAddress === normalized
          : txAddress.toLowerCase() === normalized;
      if (!match) continue;

      await this.prisma.walletTransaction.update({
        where: { id: tx.id },
        data: {
          metadata: {
            ...meta,
            swept: true,
            sweepTxHash,
            sweptAt,
          },
        },
      });
    }
  }
}
