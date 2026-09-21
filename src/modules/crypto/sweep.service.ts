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
import { LedgerService } from '../wallet/ledger.service';
import { WalletTransactionEvent } from '../wallet/wallet.service';

interface ErrorLike {
  message: string;
}

export interface SweepRunSummary {
  evmSwept: number;
  btcSwept: number;
  solSwept: number;
  tronSwept: number;
  evmSkipped: number;
  btcSkipped: number;
  solSkipped: number;
  tronSkipped: number;
  errors: string[];
  /** Per-chain swept/skipped counts keyed by canonical chain (ETH/BSC/...). */
  sweptByChain: Record<string, number>;
  skippedByChain: Record<string, number>;
}

/**
 * Consolidates confirmed on-chain balances from user deposit addresses into
 * the platform master wallet once they reach DEPOSIT_SWEEP_THRESHOLD (in USD).
 * Enabled only when the threshold is > 0 (the default of 0 keeps funds at
 * user addresses so user-sourced withdrawals continue to work). Each sweep
 * is recorded as a DEPOSIT on the platform wallet and tracked by the
 * withdrawal queue. ERC-20 sweeps require ETH at the source address for gas;
 * failures are logged and retried on the next run.
 *
 * Ledger fidelity: unlike user deposits (which route through
 * `walletService.createTransaction` and therefore get a synchronous `LedgerEntry`
 * + a domain event), a sweep writes its own `WalletTransaction` + a synchronous
 * `LedgerEntry` via `LedgerService` directly, then enqueues a `WithdrawalJob` so
 * the on-chain confirmation finalizes the booked balance. A sweep does **not**
 * emit a user-visible deposit event — it is a platform-internal consolidation,
 * not a user deposit.
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
    private readonly ledger: LedgerService,
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

  /**
   * Manual single-chain sweep — triggered via admin endpoint. Only deposit
   * addresses registered on the given chain are evaluated. Respects the
   * per-chain enable flag and threshold (falling back to the global
   * DEPOSIT_SWEEP_THRESHOLD). Returns a per-chain summary.
   */
  async manualSweepChain(chain: string): Promise<SweepRunSummary> {
    if (!this.registryChains().includes(chain)) {
      throw new Error(
        `Unsupported sweep chain: ${chain}. Expected ${this.registryChains().join(', ')}.`,
      );
    }
    if (this.isRunning) {
      throw new Error('Sweep already in progress');
    }
    this.isRunning = true;
    try {
      const summary: SweepRunSummary = {
        evmSwept: 0,
        btcSwept: 0,
        solSwept: 0,
        tronSwept: 0,
        evmSkipped: 0,
        btcSkipped: 0,
        solSkipped: 0,
        tronSkipped: 0,
        errors: [],
        sweptByChain: {},
        skippedByChain: {},
      };
      const res = await this.sweepChain(chain);
      summary.errors.push(...res.errors);
      summary.sweptByChain[chain] = (summary.sweptByChain[chain] ?? 0) + res.swept;
      summary.skippedByChain[chain] =
        (summary.skippedByChain[chain] ?? 0) + res.skipped;
      if (chain === 'BTC') {
        summary.btcSwept += res.swept;
        summary.btcSkipped += res.skipped;
      } else if (this.config.isEvmChain(chain)) {
        summary.evmSwept += res.swept;
        summary.evmSkipped += res.skipped;
      } else if (chain === 'SOLANA') {
        summary.solSwept += res.swept;
        summary.solSkipped += res.skipped;
      } else if (chain === 'TRON') {
        summary.tronSwept += res.swept;
        summary.tronSkipped += res.skipped;
      }
      return summary;
    } finally {
      this.isRunning = false;
    }
  }

  /** All chains that can carry deposit addresses (supported + BTC). */
  private registryChains(): string[] {
    return [...(this.config.supportedChains as string[]), 'BTC'];
  }

  /** Shared sweep execution guarded by the running mutex. */
  private async runSweep(): Promise<SweepRunSummary> {
    if (this.isRunning) {
      throw new Error('Sweep already in progress');
    }
    this.isRunning = true;
    try {
      const summary: SweepRunSummary = {
        evmSwept: 0,
        btcSwept: 0,
        solSwept: 0,
        tronSwept: 0,
        evmSkipped: 0,
        btcSkipped: 0,
        solSkipped: 0,
        tronSkipped: 0,
        errors: [],
        sweptByChain: {},
        skippedByChain: {},
      };
      // Sweep every supported chain plus the standalone BTC chain.
      for (const chain of this.registryChains()) {
        const res = await this.sweepChain(chain);
        summary.errors.push(...res.errors);
        summary.sweptByChain[chain] = (summary.sweptByChain[chain] ?? 0) + res.swept;
        summary.skippedByChain[chain] =
          (summary.skippedByChain[chain] ?? 0) + res.skipped;
        if (chain === 'BTC') {
          summary.btcSwept += res.swept;
          summary.btcSkipped += res.skipped;
        } else if (this.config.isEvmChain(chain)) {
          summary.evmSwept += res.swept;
          summary.evmSkipped += res.skipped;
        } else if (chain === 'SOLANA') {
          summary.solSwept += res.swept;
          summary.solSkipped += res.skipped;
        } else if (chain === 'TRON') {
          summary.tronSwept += res.swept;
          summary.tronSkipped += res.skipped;
        }
      }
      return summary;
    } finally {
      this.isRunning = false;
    }
  }

  /** Sweeps all eligible deposit addresses for a single chain. */
  private async sweepChain(chain: string): Promise<{
    swept: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { swept: 0, skipped: 0, errors: [] as string[] };
    const addresses = this.depositRegistry.addressesForChain(chain);
    if (addresses.length === 0) return result;

    const chainConfig = await this.sweepConfigFor(chain);
    if (!chainConfig.enabled) {
      this.logger.log(`${chain} sweep disabled by config; skipping ${addresses.length} addresses`);
      return { swept: 0, skipped: addresses.length, errors: [] };
    }
    const thresholdUsd =
      chainConfig.thresholdUsd ?? this.config.depositSweepThreshold;

    for (const address of addresses) {
      const registrations = this.depositRegistry.lookup(address, chain);
      // Dedupe on (currency, stored chain): per-chain EVM rows share one 0x
      // address, so a currency-only key would collapse ETH/BSC/POLYGON rows
      // into one and skip legitimate per-chain sweeps.
      const seen = new Set<string>();
      for (const reg of registrations) {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: reg.walletId },
        });
        if (!wallet) continue;
        const dedupeKey = `${wallet.currency}:${wallet.chain ?? ''}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Index 0 is the platform master/fee wallet — never sweep it to itself.
        if (
          wallet.derivationIndex === null ||
          wallet.derivationIndex === MASTER_WALLET_INDEX
        ) {
          result.skipped += 1;
          continue;
        }

        const balance = await this.chainBalance(chain, wallet.currency, address);
        const balanceUsd = this.exchangeRate.convertToUsd(
          balance,
          wallet.currency,
        );
        if (balanceUsd < thresholdUsd) continue;

        // Pre-flight: a token sweep is only possible if the source address
        // holds enough of the chain's native asset to pay gas. Native sweeps
        // (ETH/BTC) pay gas out of the swept balance itself — no extra check.
        const isNativeSweep =
          (chain === 'BTC' && wallet.currency === Currency.BTC) ||
          (this.config.isEvmChain(chain) && wallet.currency === Currency.ETH);
        if (!isNativeSweep) {
          const gasOk = await this.hasSufficientGas(
            chain,
            wallet.currency,
            address,
            balance,
          );
          if (!gasOk) {
            result.skipped += 1;
            result.errors.push(
              `${chain} ${wallet.currency} ${address}: insufficient native gas at source to pay sweep fees; fund the address to enable sweeping`,
            );
            continue;
          }
        }

        // Native sweeps (ETH/BTC) pay gas/miner fees out of the swept
        // balance itself, so deduct the estimated fee up front; otherwise
        // broadcasting the FULL balance cannot pay its own gas and always
        // fails with insufficient funds.
        let sweepAmount = balance;
        if (this.config.isEvmChain(chain) && wallet.currency === Currency.ETH) {
          const gasCost = await this.chainClient.estimateNativeTransferGasCost(
            chain,
            address,
          );
          if (gasCost > 0) {
            if (balance <= gasCost) {
              result.skipped += 1;
              result.errors.push(
                `${chain} ETH ${address}: balance ${balance} does not cover the ~${gasCost} ETH transfer gas; skipping`,
              );
              continue;
            }
            sweepAmount = balance - gasCost;
          }
        }
        if (chain === 'BTC' && wallet.currency === Currency.BTC) {
          const feePerByte = await this.chainClient.getBtcRecommendedFee();
          const feeBtc =
            await this.chainClient.estimateBtcSweepFee(address, feePerByte);
          if (feeBtc > 0) {
            if (balance <= feeBtc) {
              result.skipped += 1;
              result.errors.push(
                `${chain} BTC ${address}: balance ${balance} does not cover the ~${feeBtc} BTC miner fee; skipping`,
              );
              continue;
            }
            sweepAmount = balance - feeBtc;
          }
        }

        this.logger.log(
          `${chain} sweep candidate: ${sweepAmount} ${wallet.currency} of ${balance} total (~$${balanceUsd.toFixed(2)}) ≥ $${thresholdUsd}`,
        );
        await this.sweepChainCurrency(
          chain,
          wallet.currency,
          wallet.derivationIndex,
          address,
          sweepAmount,
          result,
        );
      }
    }
    return result;
  }

  /**
   * Whether the source address holds enough native gas to pay for a token
   * sweep. Gas-cost estimates come from ChainClientService; a failed or
   * unavailable estimate (0) is treated as sufficient so a broken estimator
   * degrades to the old behavior instead of blocking every sweep.
   */
  private async hasSufficientGas(
    chain: string,
    currency: Currency,
    address: string,
    tokenBalance: number,
  ): Promise<boolean> {
    try {
      const gasCost = await this.chainClient.estimateTokenTransferGasCost(
        chain,
        address,
        currency,
      );
      if (gasCost <= 0) return true;
      const gasBalance = await this.chainClient.getNativeGasBalance(
        chain,
        address,
      );
      if (gasBalance >= gasCost) return true;
      this.logger.warn(
        `${chain} sweep pre-flight: ${address} has ${gasBalance} native but needs ~${gasCost} for the ${currency} sweep (${tokenBalance} ${currency} will be skipped)`,
      );
      return false;
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.warn(
        `${chain} gas pre-flight failed for ${address}: ${err.message}; attempting sweep anyway`,
      );
      return true;
    }
  }

  /** Reads the on-chain balance of an address for a (chain, currency). */
  private async chainBalance(
    chain: string,
    currency: Currency,
    address: string,
  ): Promise<number> {
    if (chain === 'BTC') {
      const utxos = await this.chainClient.getBtcUtxos(address);
      return utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
    }
    if (this.config.isEvmChain(chain)) {
      return this.chainClient.getEvmBalance(address, currency, chain);
    }
    if (chain === 'SOLANA') {
      const mint = this.config.getStablecoinContractFor('SOLANA', currency);
      if (!mint) return 0;
      return this.chainClient.getSolanaTokenBalance(mint, address);
    }
    if (chain === 'TRON') {
      const contract = this.config.getStablecoinContractFor('TRON', currency);
      if (!contract) return 0;
      return this.chainClient.getTronTokenBalance(contract, address);
    }
    return 0;
  }

  /** Sweeps a single currency balance from a user address on a chain. */
  private async sweepChainCurrency(
    chain: string,
    currency: Currency,
    derivationIndex: number,
    fromAddress: string,
    balance: number,
    result: { swept: number; skipped: number; errors: string[] },
  ): Promise<void> {
    // The destination master address depends on the chain.
    const to = this.destinationAddress(chain);
    try {
      const txHash = await this.broadcastSweep(
        chain,
        currency,
        derivationIndex,
        to,
        balance,
      );

      const wallet = await this.prisma.wallet.findFirst({
        where: { address: fromAddress, currency, derivationIndex },
      });
      if (wallet) {
        await this.recordSweep(chain, currency, balance, txHash, fromAddress);
        result.swept += 1;
      } else {
        result.errors.push(
          `${chain} ${currency} ${fromAddress}: source wallet not found; sweep not recorded`,
        );
      }
    } catch (error) {
      const err = error as ErrorLike;
      result.errors.push(`${chain} ${currency} ${fromAddress}: ${err.message}`);
      this.logger.error(
        `${chain} sweep failed for ${fromAddress} (${currency}): ${err.message}`,
      );
    }
  }

  /** The platform master address to sweep funds into for a chain. */
  private destinationAddress(chain: string): string {
    if (chain === 'BTC') return this.hdWallet.getMasterAddress('BTC');
    if (this.config.isEvmChain(chain)) return this.hdWallet.getMasterAddress('EVM');
    return this.hdWallet.getMasterAddressForChain(chain);
  }

  /** Broadcasts a sweep transfer on the correct chain for the parameters. */
  private async broadcastSweep(
    chain: string,
    currency: Currency,
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    if (chain === 'BTC') {
      const feePerByte = await this.chainClient.getBtcRecommendedFee();
      return this.chainClient.broadcastBtc(fromIndex, to, amount, feePerByte);
    }
    if (this.config.isEvmChain(chain)) {
      return currency === Currency.ETH
        ? this.chainClient.broadcastEvmNative(fromIndex, to, amount, chain)
        : this.chainClient.broadcastEvmToken(currency, fromIndex, to, amount, chain);
    }
    if (chain === 'SOLANA') {
      return this.chainClient.broadcastSolanaToken(currency, fromIndex, to, amount);
    }
    if (chain === 'TRON') {
      return this.chainClient.broadcastTronToken(currency, fromIndex, to, amount);
    }
    throw new Error(`Unsupported sweep chain: ${chain}`);
  }

  private async recordSweep(
    chain: string,
    currency: Currency,
    amount: number,
    txHash: string,
    fromAddress: string,
  ): Promise<void> {
    const destination = this.destinationAddress(chain);

    // Credit the platform wallet (index 0) — sweep is a DEPOSIT to the master wallet
    const platformWallet = await this.platformService.getPlatformFeeWallet(
      currency,
      chain,
    );
    if (!platformWallet) {
      throw new Error(`Platform fee wallet not found for ${currency}/${chain}`);
    }

    // 1. Create the WalletTransaction (PENDING — finalized on-chain by the tracker).
    const sweepTx = await this.prisma.walletTransaction.create({
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

    // 2. Write a synchronous ledger entry so the platform wallet's ledger is
    // complete at sweep time (not only after on-chain confirmation). The sweep
    // is a platform credit, so this is an unconditional increment.
    await this.ledger.createEntry(this.prisma, {
      walletId: platformWallet.id,
      transactionId: sweepTx.id,
      amount,
      type: LedgerType.DEPOSIT,
      reference: `${txHash}-ledger`,
      metadata: {
        destination,
        blockchain: chain,
        provider: 'alchemy',
        sweep: true,
        fromAddress,
        initiatedAt: new Date().toISOString(),
      },
    });

    await this.tracker.enqueue({
      txHash,
      walletId: platformWallet.id,
      currency,
      chain,
      amount,
      destination,
      metadata: { source: 'DEPOSIT_SWEEP' },
    });

    // Mark matching user deposit transactions as swept and link the sweep tx.
    await this.markMatchedDepositsSwept(chain, currency, fromAddress, txHash);
  }

  /**
   * Flags the user DEPOSIT transactions that funded a swept address as swept,
   * linking the sweep transaction hash. This is how depositors know their funds
   * were consolidated to the platform master wallet.
   */
  private async markMatchedDepositsSwept(
    chain: string,
    currency: Currency,
    fromAddress: string,
    sweepTxHash: string,
  ): Promise<void> {
    if (!fromAddress) return;

    const evmFamily = this.config.isEvmChain(chain);
    const normalized = evmFamily ? fromAddress.toLowerCase() : fromAddress;
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
      const match = evmFamily
        ? txAddress.toLowerCase() === normalized
        : txAddress === normalized;
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

  // ─── Per-chain Sweep Configuration ──────────────────────────────────────

  /** Effective sweep config for a single chain (DB row or built-in defaults). */
  private async sweepConfigFor(chain: string): Promise<{
    chain: string;
    enabled: boolean;
    thresholdUsd: number | null;
  }> {
    const row = await this.prisma.sweepConfig.findUnique({
      where: { chain },
    });
    return {
      chain,
      enabled: row ? row.enabled : true,
      thresholdUsd: row?.thresholdUsd
        ? Number(row.thresholdUsd.toString())
        : null,
    };
  }

  /** Config for every sweepable chain, merged with the global threshold. */
  async getSweepConfig() {
    const rows = await this.prisma.sweepConfig.findMany();
    const byChain = new Map(rows.map((r) => [r.chain, r]));
    const globalThresholdUsd = this.config.depositSweepThreshold;
    return {
      globalThresholdUsd,
      chains: this.registryChains().map((chain) => {
        const row = byChain.get(chain);
        return {
          chain,
          enabled: row ? row.enabled : true,
          thresholdUsd: row?.thresholdUsd
            ? Number(row.thresholdUsd.toString())
            : null,
          usesGlobalThreshold: !row?.thresholdUsd,
        };
      }),
    };
  }

  /** Upserts a chain's sweep enable flag and/or USD threshold override. */
  async updateSweepConfig(
    chain: string,
    changes: { enabled?: boolean; thresholdUsd?: number | null },
  ) {
    if (!this.registryChains().includes(chain)) {
      throw new Error(
        `Unsupported sweep chain: ${chain}. Expected ${this.registryChains().join(', ')}.`,
      );
    }
    const data: { enabled?: boolean; thresholdUsd?: number | null } = {};
    if (typeof changes.enabled === 'boolean') data.enabled = changes.enabled;
    if (changes.thresholdUsd !== undefined) {
      data.thresholdUsd =
        changes.thresholdUsd === null ? null : changes.thresholdUsd;
    }
    if (Object.keys(data).length === 0) {
      throw new Error('Nothing to update: provide enabled and/or thresholdUsd');
    }
    const row = await this.prisma.sweepConfig.upsert({
      where: { chain },
      create: { chain, ...data },
      update: data,
    });
    this.logger.log(`Sweep config updated for ${chain}: ${JSON.stringify(data)}`);
    return {
      chain: row.chain,
      enabled: row.enabled,
      thresholdUsd: row.thresholdUsd
        ? Number(row.thresholdUsd.toString())
        : null,
    };
  }
}
