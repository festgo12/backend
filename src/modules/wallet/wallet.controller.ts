import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
  UseGuards,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { WalletService } from './wallet.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { CryptoRiskService } from '../security/crypto-risk.service';
import { HdWalletService } from '../crypto/hd-wallet.service';
import { DepositAddressRegistry } from '../crypto/deposit-address-registry.service';
import { CryptoWithdrawalService } from '../crypto/crypto-withdrawal.service';
import { Currency } from '@src/generated/client';
import type { User } from '@src/generated/client';
import { isUUID } from 'class-validator';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly cryptoRisk: CryptoRiskService,
    private readonly hdWallet: HdWalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly cryptoWithdrawal: CryptoWithdrawalService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallets for the current user' })
  async getWallets(@GetUser() user: User) {
    return this.walletService.getUserWallets(user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get transaction history for a wallet or all user wallets',
  })
  async getHistory(
    @GetUser() user: User,
    @Query('walletId') walletId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    const cleanWalletId = walletId?.trim();
    if (
      cleanWalletId &&
      cleanWalletId !== 'null' &&
      cleanWalletId !== 'undefined'
    ) {
      if (!isUUID(cleanWalletId)) {
        throw new BadRequestException('walletId must be a valid UUID');
      }
      return this.walletService.getWalletHistory(cleanWalletId, limit, offset);
    }
    return this.walletService.getUserHistory(user.id, limit, offset);
  }

  @Get('rates')
  @ApiOperation({
    summary: 'Get current crypto-to-NGN exchange rates (cached)',
  })
  getExchangeRates() {
    const rates = this.exchangeRateService.getAllRates();
    const info = this.exchangeRateService.getRateInfo();
    return {
      rates,
      lastUpdated: info.lastUpdated,
      ageMinutes: info.ageMinutes,
      source: info.source,
    };
  }

  @Post('init')
  @AuditLog('WALLET_CREATION', 'WALLET')
  @ApiOperation({ summary: 'Initialize a wallet for a specific currency' })
  async initWallet(
    @GetUser() user: User,
    @Body('currency') currency: Currency,
  ) {
    const wallet = await this.walletService.getOrCreateWallet(
      user.id,
      currency,
    );

    if (currency !== Currency.NGN && !wallet.address) {
      try {
        // Local-first path: derive the deposit address from the platform HD
        // wallet with zero external API calls (alchemy provider).
        const info = await this.hdWallet.getOrAssignDepositInfo(
          user.id,
          currency,
        );
        const updatedWallet = await this.walletService.updateWalletDepositInfo(
          wallet.id,
          {
            address: info.address,
            derivationIndex: info.derivationIndex,
            chain: info.chain,
          },
        );
        this.depositRegistry.register(info.address, info.chain, wallet.id);
        return updatedWallet;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to execute wallet initialization sequence for user ${user.id} (${currency}): ${message}`,
        );
        throw new InternalServerErrorException(
          message ||
            `Could not complete blockchain generation layer for ${currency}.`,
        );
      }
    }

    return wallet;
  }

  @Post('withdraw')
  @AuditLog('CRYPTO_WITHDRAWAL', 'WALLET')
  @ApiOperation({ summary: 'Withdraw crypto to an external address' })
  async withdrawCrypto(
    @GetUser() user: User,
    @Body('walletId') walletId: string,
    @Body('address') address: string,
    @Body('amount') amount: number,
  ) {
    if (!walletId || !isUUID(walletId)) {
      throw new BadRequestException('Valid walletId is required');
    }
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Destination address is required');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // 1. Verify user owns this wallet
    const userWallet = await this.walletService.getUserWallets(user.id);
    const ownedWallet = userWallet.find(
      (w: { id: string }) => w.id === walletId,
    );

    if (!ownedWallet) {
      throw new BadRequestException('Wallet not found or access denied');
    }

    // 2. Verify it's a crypto wallet
    if (ownedWallet.currency === Currency.NGN) {
      throw new BadRequestException(
        'NGN withdrawals use Paystack, not crypto withdrawal',
      );
    }

    // 3. Run full risk screening (address + transaction + user risk level)
    const chain =
      ownedWallet.currency === Currency.BTC ? 'bitcoin' : 'ethereum';
    const addressResult = await this.cryptoRisk.screenAddress(
      address.trim(),
      chain,
      'withdrawal',
    );
    if (!addressResult.isSafe) {
      this.logger.warn(
        `Withdrawal blocked by address screening: user=${user.id}, address=${address}, score=${addressResult.riskScore}`,
      );
      throw new BadRequestException(
        `Destination address failed security screening: ${addressResult.reasons[0]}. Contact support if you believe this is an error.`,
      );
    }

    const txResult = await this.cryptoRisk.screenTransaction({
      userId: user.id,
      currency: ownedWallet.currency,
      amount,
      destinationAddress: address.trim(),
    });
    if (!txResult.approved) {
      this.logger.warn(
        `Withdrawal blocked by transaction screening: user=${user.id}, reasons=${txResult.reasons.join('; ')}`,
      );
      throw new BadRequestException(
        `Transaction blocked: ${txResult.reasons[0]}. Contact support if you believe this is an error.`,
      );
    }

    // 4. Process withdrawal via the local (Alchemy) provider
    const result = await this.cryptoWithdrawal.processWithdrawal({
      walletId,
      amount,
      destinationAddress: address.trim(),
      currency: ownedWallet.currency,
    });

    return {
      success: true,
      txId: result.txId,
      status: result.status,
      message: 'Withdrawal submitted and awaiting blockchain confirmation',
    };
  }
}
