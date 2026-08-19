import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainClientService } from './chain-client.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { HdWalletService } from './hd-wallet.service';
import { PlatformService } from './platform.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  response?: { data?: { message?: string } };
}

/**
 * Local-first (Alchemy) withdrawal executor. Mirrors the legacy withdrawal
 * service's contract so the controller can swap providers transparently:
 * validate balance -> broadcast with a locally derived key -> record a
 * PENDING WalletTransaction -> enqueue a WithdrawalJob for confirmation
 * polling. Zero external API calls.
 */
@Injectable()
export class CryptoWithdrawalService {
  private readonly logger = new Logger(CryptoWithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hdWallet: HdWalletService,
    private readonly chainClient: ChainClientService,
    private readonly tracker: WithdrawalTrackerService,
    private readonly platformService: PlatformService,
  ) {}

  async processWithdrawal(params: {
    walletId: string;
    amount: number;
    destinationAddress: string;
    currency: Currency;
  }): Promise<{ txId: string; status: string }> {
    const { walletId, amount, destinationAddress, currency } = params;

    this.logger.log(
      `Initiating local withdrawal: ${amount} ${currency} to ${destinationAddress}`,
    );

    // 1. Validate balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new BadRequestException('Wallet not found');

    const available = wallet.balance.minus(wallet.reservedBalance);
    if (available.lessThan(amount)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${available.toString()} ${currency}`,
      );
    }

    // 2. Require a locally-derived address/index
    if (!wallet.address || wallet.derivationIndex === null) {
      throw new BadRequestException(
        'Wallet has no on-chain address yet. Please request a deposit address first.',
      );
    }
    const fromIndex = wallet.derivationIndex;

    // 3. Validate destination format
    this.validateAddress(currency, destinationAddress);

    // 4. Broadcast with the wallet's own derived key
    let txHash: string;
    try {
      if (currency === Currency.BTC) {
        const feePerByte = await this.chainClient.getBtcRecommendedFee();
        txHash = await this.chainClient.broadcastBtc(
          fromIndex,
          destinationAddress,
          amount,
          feePerByte,
        );
      } else if (currency === Currency.ETH) {
        txHash = await this.chainClient.broadcastEvmNative(
          fromIndex,
          destinationAddress,
          amount,
        );
      } else if (currency === Currency.USDT || currency === Currency.USDC) {
        txHash = await this.chainClient.broadcastEvmToken(
          currency,
          fromIndex,
          destinationAddress,
          amount,
        );
      } else {
        throw new BadRequestException(
          `Withdrawals not supported for ${currency}`,
        );
      }
    } catch (error) {
      const err = error as ErrorLike;
      const message = err.response?.data?.message || err.message;
      this.logger.error(
        `Blockchain submission failed for ${currency}: ${message}`,
      );

      await this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: LedgerType.WITHDRAWAL,
          amount,
          status: 'FAILED',
          reference: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          metadata: {
            destination: destinationAddress,
            blockchain: this.hdWallet.chainForCurrency(currency),
            provider:
              this.hdWallet.chainForCurrency(currency) === 'BTC'
                ? 'quicknode'
                : 'alchemy',
            lastError: message,
            retryCount: 0,
          },
        },
      });

      throw new InternalServerErrorException(`Withdrawal failed: ${message}`);
    }

    // 5. Record PENDING transaction + enqueue confirmation job
    await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: txHash,
        metadata: {
          destination: destinationAddress,
          blockchain: this.hdWallet.chainForCurrency(currency),
          provider:
            this.hdWallet.chainForCurrency(currency) === 'BTC'
              ? 'quicknode'
              : 'alchemy',
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await this.tracker.enqueue({
      txHash,
      walletId,
      currency,
      amount,
      destination: destinationAddress,
      metadata: { source: 'USER_WITHDRAWAL' },
    });

    this.logger.log(
      `Local withdrawal submitted: ${txHash} (${amount} ${currency})`,
    );
    return { txId: txHash, status: 'PENDING' };
  }

  /**
   * Retries a previously failed withdrawal. Only locally-derived wallets can
   * be retried through this path.
   */
  async retryWithdrawal(
    transactionId: string,
  ): Promise<{ txId: string; status: string }> {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!tx || tx.status !== 'FAILED') {
      throw new BadRequestException(
        'Transaction not found or not in FAILED status',
      );
    }

    const meta = (tx.metadata ?? {}) as { destination?: string };

    await this.prisma.walletTransaction.delete({
      where: { id: transactionId },
    });

    return this.processWithdrawal({
      walletId: tx.walletId,
      amount: tx.amount.toNumber(),
      destinationAddress: meta.destination ?? '',
      currency: tx.wallet.currency,
    });
  }

  /**
   * Sweeps a platform fee wallet to a treasury/destination address. Used by
   * admins to move accumulated fee revenue off-chain. Sourced from the fee
   * wallet's locally-derived address; the sweep is tracked by the withdrawal
   * queue so confirmations update the ledger debit automatically.
   */
  async sweepFeeWallet(params: {
    currency: Currency;
    destinationAddress: string;
    amount?: number;
  }): Promise<{ txId: string; status: string }> {
    const { currency, destinationAddress, amount } = params;

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    this.validateAddress(currency, destinationAddress);

    const feeWallet = await this.platformService.getPlatformFeeWallet(currency);
    if (!feeWallet) {
      throw new BadRequestException(`Fee wallet not found for ${currency}`);
    }
    if (!feeWallet.address) {
      throw new BadRequestException(
        `Fee wallet for ${currency} has no on-chain address`,
      );
    }

    let fromIndex = feeWallet.derivationIndex;
    if (fromIndex === null) {
      // Legacy fee wallet (pre-HD address, no derivation index): reassign the
      // platform's pinned master address (index 0) so the sweep can be signed
      // from a derived key. Deterministic across DB resets.
      const info =
        currency === Currency.BTC
          ? {
              address: this.hdWallet.getMasterAddress('BTC'),
              derivationIndex: 0,
              chain: 'BTC' as const,
            }
          : {
              address: this.hdWallet.getMasterAddress('EVM'),
              derivationIndex: 0,
              chain: 'EVM' as const,
            };
      await this.prisma.wallet.update({
        where: { id: feeWallet.id },
        data: {
          address: info.address,
          derivationIndex: info.derivationIndex,
          chain: info.chain,
        },
      });
      fromIndex = info.derivationIndex;
    }

    let txHash: string;
    try {
      if (currency === Currency.BTC) {
        const feePerByte = await this.chainClient.getBtcRecommendedFee();
        txHash = await this.chainClient.broadcastBtc(
          fromIndex,
          destinationAddress,
          amount,
          feePerByte,
        );
      } else if (currency === Currency.ETH) {
        txHash = await this.chainClient.broadcastEvmNative(
          fromIndex,
          destinationAddress,
          amount,
        );
      } else if (currency === Currency.USDT || currency === Currency.USDC) {
        txHash = await this.chainClient.broadcastEvmToken(
          currency,
          fromIndex,
          destinationAddress,
          amount,
        );
      } else {
        throw new BadRequestException(
          `Withdrawals not supported for ${currency}`,
        );
      }
    } catch (error) {
      const err = error as ErrorLike;
      const message = err.response?.data?.message || err.message;
      this.logger.error(`Fee sweep failed for ${currency}: ${message}`);
      throw new InternalServerErrorException(`Fee sweep failed: ${message}`);
    }

    await this.prisma.walletTransaction.create({
      data: {
        walletId: feeWallet.id,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: txHash,
        metadata: {
          destination: destinationAddress,
          blockchain: this.hdWallet.chainForCurrency(currency),
          provider:
            this.hdWallet.chainForCurrency(currency) === 'BTC'
              ? 'quicknode'
              : 'alchemy',
          sweep: true,
          feeWallet: true,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await this.tracker.enqueue({
      txHash,
      walletId: feeWallet.id,
      currency,
      amount,
      destination: destinationAddress,
      metadata: { source: 'FEE_WALLET_SWEEP' },
    });

    this.logger.log(
      `Fee wallet sweep submitted: ${amount} ${currency} -> ${destinationAddress} (TX: ${txHash})`,
    );
    return { txId: txHash, status: 'PENDING' };
  }

  private validateAddress(currency: Currency, address: string) {
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Invalid destination address');
    }

    const trimmed = address.trim();

    switch (currency) {
      case Currency.BTC:
        if (
          !/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(
            trimmed,
          )
        ) {
          throw new BadRequestException('Invalid Bitcoin address format');
        }
        break;
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
          throw new BadRequestException('Invalid Ethereum address format');
        }
        break;
      default:
        throw new BadRequestException(
          `Unsupported withdrawal currency: ${currency}`,
        );
    }
  }
}
