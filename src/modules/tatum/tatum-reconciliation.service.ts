import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from '../wallet/ledger.service';
import { Currency, LedgerType } from '@src/generated/client';
import { Decimal } from '@src/generated/client/runtime/library';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumPlatformService } from './tatum-platform.service';
import { getStablecoinContract } from './tatum-deposit.service';

@Injectable()
export class TatumReconciliationService {
  private readonly logger = new Logger(TatumReconciliationService.name);
  private readonly apiKey: string;
  private readonly dataBaseUrl = 'https://api.tatum.io/v4';
  private readonly cryptoCurrencies = [
    Currency.BTC,
    Currency.ETH,
    Currency.USDT,
    Currency.USDC,
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly tatumWallet: TatumWalletService,
    private readonly platformService: TatumPlatformService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  private getTolerance(): Decimal {
    return new Decimal(
      this.configService.get<string>('RECONCILIATION_TOLERANCE', '0.00000001'),
    );
  }

  private autoAdjustEnabled(): boolean {
    return (
      this.configService.get<string>('RECONCILIATION_AUTO_ADJUST', 'false') ===
      'true'
    );
  }

  /**
   * Token-aware on-chain balance for a wallet's address.
   */
  private async getOnChainBalance(wallet: {
    id: string;
    currency: Currency;
    address: string | null;
  }): Promise<number> {
    if (!wallet.address) return 0;

    const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(wallet.currency);

    try {
      let balance: number;
      if (
        wallet.currency === Currency.BTC ||
        wallet.currency === Currency.ETH
      ) {
        const response = await lastValueFrom(
          this.httpService.get(`${this.dataBaseUrl}/data/blockchains/balance`, {
            params: { chain: v4Chain, address: wallet.address },
            headers: this.headers,
          }),
        );
        balance = parseFloat(response.data?.balance || '0');
      } else {
        // USDT / USDC are ERC-20 tokens on Ethereum
        const contract = getStablecoinContract(
          wallet.currency,
          this.configService,
        );
        if (!contract) return 0;
        const response = await lastValueFrom(
          this.httpService.get(`${this.dataBaseUrl}/data/wallet/portfolio`, {
            params: {
              chain: v4Chain,
              addresses: wallet.address,
              tokenTypes: 'fungible',
            },
            headers: this.headers,
          }),
        );
        const match = (response.data?.result || []).find(
          (r: any) =>
            r.tokenAddress &&
            String(r.tokenAddress).toLowerCase() === contract.toLowerCase(),
        );
        balance = parseFloat(match?.balance || '0');
      }
      return balance;
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch on-chain balance for ${wallet.currency} wallet ${wallet.id}: ${error.response?.data?.message || error.message}`,
      );
      return 0;
    }
  }

  /**
   * Reconciles internal ledger balances against on-chain balances for an asset.
   */
  async reconcileAsset(
    asset: Currency,
    opts?: { applyAdjustment?: boolean },
  ): Promise<{
    currency: Currency;
    internalBalance: string;
    onChainBalance: string;
    difference: string;
    status: string;
    reconciliationId: string;
  }> {
    const applyAdjustment = opts?.applyAdjustment ?? this.autoAdjustEnabled();

    const agg = await this.prisma.wallet.aggregate({
      where: { currency: asset },
      _sum: { balance: true, reservedBalance: true },
    });
    const internalBalance = new Decimal(agg._sum.balance || 0).plus(
      agg._sum.reservedBalance || 0,
    );

    const wallets = await this.prisma.wallet.findMany({
      where: { currency: asset, address: { not: null } },
    });

    let onChain = new Decimal(0);
    for (const wallet of wallets) {
      const bal = await this.getOnChainBalance(wallet);
      onChain = onChain.plus(bal);
    }

    const difference = internalBalance.minus(onChain);
    const tolerance = this.getTolerance();
    const absDiff = difference.abs();
    let status = absDiff.lte(tolerance) ? 'IN_BALANCE' : 'DISCREPANCY';

    const record = await this.prisma.reconciliation.create({
      data: {
        currency: asset,
        internalBalance,
        onChainBalance: onChain,
        difference,
        status,
        metadata: {
          walletCount: wallets.length,
          tolerance: tolerance.toString(),
          onChainSources: wallets.length,
        },
      },
    });

    // Bring books in line by adjusting the platform fee wallet (platform P&L).
    if (status === 'DISCREPANCY' && applyAdjustment && !difference.isZero()) {
      try {
        const feeWallet =
          await this.platformService.getPlatformFeeWallet(asset);
        if (feeWallet) {
          await this.prisma.$transaction(async (tx) => {
            await this.ledger.createEntry(tx, {
              walletId: feeWallet.id,
              amount: difference.toNumber(),
              type: LedgerType.RECONCILIATION_ADJUSTMENT,
              reference: `RECON-${asset}-${record.id}`,
              metadata: {
                reconciliationId: record.id,
                internalBalance: internalBalance.toString(),
                onChainBalance: onChain.toString(),
              },
            });
          });
          await this.prisma.reconciliation.update({
            where: { id: record.id },
            data: {
              status: 'ADJUSTED',
              reference: `RECON-${asset}-${record.id}`,
            },
          });
          status = 'ADJUSTED';
          this.logger.log(
            `Reconciliation ${asset}: adjusted fee wallet by ${difference.toString()}`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `Reconciliation adjustment failed for ${asset}: ${error.message}`,
        );
      }
    }

    if (status !== 'IN_BALANCE') {
      this.logger.warn(
        `Reconciliation ${asset}: internal=${internalBalance.toString()}, on-chain=${onChain.toString()}, diff=${difference.toString()} [${status}]`,
      );
    }

    return {
      currency: asset,
      internalBalance: internalBalance.toString(),
      onChainBalance: onChain.toString(),
      difference: difference.toString(),
      status,
      reconciliationId: record.id,
    };
  }

  /**
   * Reconciles all supported crypto assets.
   */
  async reconcileAll(): Promise<{ results: any[] }> {
    const results: any[] = [];
    for (const asset of this.cryptoCurrencies) {
      try {
        results.push(await this.reconcileAsset(asset));
      } catch (error: any) {
        this.logger.error(
          `Reconciliation failed for ${asset}: ${error.message}`,
        );
        results.push({
          currency: asset,
          status: 'ERROR',
          error: error.message,
        });
      }
    }
    return { results };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledReconciliation() {
    await this.reconcileAll();
  }
}
