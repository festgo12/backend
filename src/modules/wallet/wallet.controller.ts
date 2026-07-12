import { Controller, Get, Post, Body, BadRequestException, InternalServerErrorException, UseGuards, Query, ParseIntPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { Currency } from '@prisma/client';
import type { User } from '@prisma/client';
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
    private readonly tatumWallet: TatumWalletService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all wallets for the current user' })
  async getWallets(@GetUser() user: User) {
    return this.walletService.getUserWallets(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get transaction history for a wallet or all user wallets' })
  async getHistory(
    @GetUser() user: User,
    @Query('walletId') walletId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    // Sanitize walletId: treat empty, "null", and "undefined" strings as absent
    const cleanWalletId = walletId?.trim();
    if (cleanWalletId && cleanWalletId !== 'null' && cleanWalletId !== 'undefined') {
      if (!isUUID(cleanWalletId)) {
        throw new BadRequestException('walletId must be a valid UUID');
      }
      return this.walletService.getWalletHistory(cleanWalletId, limit, offset);
    }
    return this.walletService.getUserHistory(user.id, limit, offset);
  }


  @Post('init')
  @AuditLog('WALLET_CREATION', 'WALLET')
  @ApiOperation({ summary: 'Initialize a wallet for a specific currency' })
  async initWallet(@GetUser() user: User, @Body('currency') currency: Currency) {
    // 1. Get or build database record row entry placeholder frame first
    const wallet = await this.walletService.getOrCreateWallet(user.id, currency);

    // 2. If it's a crypto wallet and doesn't have an address, generate one deterministically
    if (currency !== Currency.NGN && !wallet.address) {
      try {
        const xpub = await this.tatumWallet.getOrGenerateXpub(currency);

        // Deterministic derivation index lookup based on DB entity identity mapping
        const index = Math.abs(this.hashCode(wallet.id)) % 1000000;

        // Request Tatum network signature assignment
        const address = await this.tatumWallet.generateAddress(currency, xpub, index);

        // Commit newly assigned hot address storage layer strings to database 
        return await this.walletService.updateWalletAddress(wallet.id, address);
      } catch (error: any) {
        this.logger.error(`Failed to execute wallet initialization sequence for user ${user.id} (${currency}): ${error.message}`);

        throw new InternalServerErrorException(
          error.message || `Could not complete blockchain generation layer for ${currency}.`
        );
      }
    }

    return wallet;
  }

  /**
   * Helper utility to safely yield unique signed integer bounds for addressing lines
   */
  private hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
  }
}
