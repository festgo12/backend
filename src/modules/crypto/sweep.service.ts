import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
}

/**
 * Consolidates confirmed on-chain balances from user deposit addresses into
 * the platform master wallet once they reach DEPOSIT_SWEEP_THRESHOLD. Enabled
 * only when the threshold is > 0 (the default of 0 keeps funds at user
 * addresses so user-sourced withdrawals continue to work). Each sweep is
 * recorded as a WITHDRAWAL WalletTransaction and tracked by the withdrawal
 * queue. ERC-20 sweeps require ETH at the source address for gas; failures
 * are logged and retried on the next run.
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
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepAll() {
    if (!this.config.isAlchemy || this.isRunning) return;
    if (this.config.depositSweepThreshold <= 0) return;
    this.isRunning = true;
    try {
      await this.sweepEvm();
      await this.sweepBtc();
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`Sweep run failed: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async sweepEvm(): Promise<void> {
    const addresses = this.depositRegistry.addressesForChain('EVM');
    if (addresses.length === 0) return;
    const threshold = this.config.depositSweepThreshold;

    for (const address of addresses) {
      const registrations = this.depositRegistry.lookup(address, 'EVM');
      const seen = new Set<Currency>();
      for (const reg of registrations) {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: reg.walletId },
        });
        if (!wallet || seen.has(wallet.currency)) continue;
        seen.add(wallet.currency);

        if (wallet.derivationIndex === null) continue;
        const balance = await this.chainClient.getEvmBalance(
          address,
          wallet.currency,
        );
        if (balance < threshold) continue;

        await this.sweepEvmCurrency(
          wallet.currency,
          wallet.derivationIndex,
          address,
          balance,
        );
      }
    }
  }

  private async sweepBtc(): Promise<void> {
    const addresses = this.depositRegistry.addressesForChain('BTC');
    if (addresses.length === 0) return;
    const threshold = this.config.depositSweepThreshold;

    for (const address of addresses) {
      const registrations = this.depositRegistry.lookup(address, 'BTC');
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: registrations[0]?.walletId || '' },
      });
      if (!wallet || wallet.derivationIndex === null) continue;

      const utxos = await this.chainClient.getBtcUtxos(address);
      const balance = utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
      if (balance < threshold) continue;

      try {
        const feePerByte = await this.chainClient.getBtcRecommendedFee();
        const txid = await this.chainClient.broadcastBtc(
          wallet.derivationIndex,
          this.hdWallet.getMasterAddress('BTC'),
          balance,
          feePerByte,
        );
        await this.recordSweep(wallet.id, Currency.BTC, balance, txid, address);
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.error(`BTC sweep failed for ${address}: ${err.message}`);
      }
    }
  }

  private async sweepEvmCurrency(
    currency: Currency,
    derivationIndex: number,
    fromAddress: string,
    balance: number,
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
        await this.recordSweep(
          wallet.id,
          currency,
          balance,
          txHash,
          fromAddress,
        );
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(
        `EVM sweep failed for ${fromAddress} (${currency}): ${err.message}`,
      );
    }
  }

  private async recordSweep(
    walletId: string,
    currency: Currency,
    amount: number,
    txHash: string,
    fromAddress: string,
  ): Promise<void> {
    const destination = this.hdWallet.getMasterAddress(
      currency === Currency.BTC ? 'BTC' : 'EVM',
    );
    await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: txHash,
        metadata: {
          destination,
          blockchain: currency === Currency.BTC ? 'BTC' : 'EVM',
          provider: 'alchemy',
          sweep: true,
          fromAddress,
          initiatedAt: new Date().toISOString(),
        },
      },
    });
    await this.tracker.enqueue({
      txHash,
      walletId,
      currency,
      amount,
      destination,
      metadata: { source: 'SWEEP' },
    });
  }
}
