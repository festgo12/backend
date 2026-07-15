import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency, LedgerType } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';

@Injectable()
export class TatumWithdrawalService {
  private readonly logger = new Logger(TatumWithdrawalService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Processes a withdrawal request end-to-end.
   * Flow: validate balance → derive key → submit to chain → record PENDING tx
   */
  async processWithdrawal(params: {
    walletId: string;
    amount: number;
    destinationAddress: string;
    currency: Currency;
  }) {
    const { walletId, amount, destinationAddress, currency } = params;

    this.logger.log(`Initiating withdrawal: ${amount} ${currency} to ${destinationAddress}`);

    // 1. Validate sufficient balance
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new BadRequestException('Wallet not found');

    const available = wallet.balance.minus(wallet.reservedBalance);
    if (available.lessThan(amount)) {
      throw new BadRequestException(`Insufficient balance. Available: ${available.toString()} ${currency}`);
    }

    // 2. Validate destination address format
    this.validateAddress(currency, destinationAddress);

    // 3. Map to Tatum chain
    const chain = this.tatumWallet.mapCurrencyToChain(currency);

    // 4. Build transfer body with real key derivation
    const body = await this.buildTransferBody(currency, destinationAddress, amount.toString());

    // 5. Submit blockchain transaction
    let txId: string;
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/${chain}/transaction`, body, {
          headers: this.headers,
        }).pipe(
          retry({
            count: 2,
            delay: (error, retryCount) => {
              this.logger.warn(`Withdrawal retry ${retryCount} for ${currency}: ${error.message}`);
              return timer(retryCount * 2000);
            },
          }),
        ),
      );

      txId = response.data.txId;

      if (!txId) {
        throw new Error('No txId returned from Tatum');
      }
    } catch (error: any) {
      const tatumMsg = error.response?.data?.message || error.message;
      this.logger.error(`Blockchain submission failed for ${currency}: ${tatumMsg}`);

      // Record failed attempt for admin retry queue
      await this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: LedgerType.WITHDRAWAL,
          amount,
          status: 'FAILED',
          reference: `failed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          metadata: {
            destination: destinationAddress,
            blockchain: chain,
            lastError: tatumMsg,
            retryCount: 0,
          },
        },
      });

      throw new InternalServerErrorException(`Withdrawal failed: ${tatumMsg}`);
    }

    // 6. Record PENDING withdrawal transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: txId,
        metadata: {
          destination: destinationAddress,
          blockchain: chain,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Withdrawal submitted: ${txId} (${amount} ${currency})`);
    return { txId, status: 'PENDING' };
  }

  /**
   * Retries a previously failed withdrawal by its transaction ID.
   */
  async retryWithdrawal(transactionId: string) {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!tx || tx.status !== 'FAILED') {
      throw new BadRequestException('Transaction not found or not in FAILED status');
    }

    const meta = (tx.metadata as any) || {};

    // Delete the old failed record
    await this.prisma.walletTransaction.delete({ where: { id: transactionId } });

    // Re-attempt
    return this.processWithdrawal({
      walletId: tx.walletId,
      amount: tx.amount.toNumber(),
      destinationAddress: meta.destination,
      currency: tx.wallet.currency,
    });
  }

  /**
   * Validates that a destination address matches expected format for the chain.
   */
  private validateAddress(currency: Currency, address: string) {
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Invalid destination address');
    }

    const trimmed = address.trim();

    switch (currency) {
      case Currency.BTC:
        // Legacy (1...), P2SH (3...), or Bech32 (bc1...)
        if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(trimmed)) {
          throw new BadRequestException('Invalid Bitcoin address format');
        }
        break;
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        // Ethereum address: 0x + 40 hex chars
        if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
          throw new BadRequestException('Invalid Ethereum address format');
        }
        break;
      default:
        throw new BadRequestException(`Unsupported withdrawal currency: ${currency}`);
    }
  }

  /**
   * Builds the chain-specific transfer body using derived private keys.
   */
  private async buildTransferBody(currency: Currency, to: string, amount: string) {
    const mnemonic = this.configService.get<string>(`TATUM_${currency}_MNEMONIC`);
    const addressIndex = this.configService.get<number>(`TATUM_${currency}_DERIVATION_INDEX`, 0);

    switch (currency) {
      case Currency.BTC: {
        if (!mnemonic) {
          throw new InternalServerErrorException(`Missing TATUM_BTC_MNEMONIC environment variable`);
        }
        const privateKey = await this.tatumWallet.generatePrivateKey(Currency.BTC, mnemonic, addressIndex);
        return {
          fromAddress: [{
            address: await this.tatumWallet.generateAddress(
              Currency.BTC,
              this.configService.get<string>('TATUM_BTC_XPUBLIC') || '',
              addressIndex,
            ),
            signatureId: privateKey,
          }],
          to: [{ address: to, value: parseFloat(amount) }],
        };
      }

      case Currency.ETH: {
        if (!mnemonic) {
          throw new InternalServerErrorException(`Missing TATUM_ETH_MNEMONIC environment variable`);
        }
        const privateKey = await this.tatumWallet.generatePrivateKey(Currency.ETH, mnemonic, addressIndex);
        return {
          to,
          currency: 'ETH',
          amount,
          fromPrivateKey: privateKey,
        };
      }

      case Currency.USDT:
      case Currency.USDC: {
        if (!mnemonic) {
          throw new InternalServerErrorException(`Missing TATUM_${currency}_MNEMONIC environment variable`);
        }
        const privateKey = await this.tatumWallet.generatePrivateKey(currency, mnemonic, addressIndex);
        return {
          to,
          currency,
          amount,
          fromPrivateKey: privateKey,
          fee: { gasLimit: '100000', gasPrice: '20' },
        };
      }

      default:
        throw new BadRequestException(`Withdrawals not supported for ${currency}`);
    }
  }
}
