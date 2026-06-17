import { Controller, Get, Post, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { WalletService } from './wallet.service';
import { TatumWalletService } from '../tatum/tatum-wallet.service';
import { Currency } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletController {
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
  @ApiOperation({ summary: 'Get transaction history for a wallet' })
  async getHistory(
    @Query('walletId') walletId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.walletService.getWalletHistory(walletId, limit, offset);
  }

  @Post('init')
  @ApiOperation({ summary: 'Initialize a wallet for a specific currency' })
  async initWallet(@GetUser() user: User, @Body('currency') currency: Currency) {
    const wallet = await this.walletService.getOrCreateWallet(user.id, currency);

    // If it's a crypto wallet and doesn't have an address, generate one
    if (currency !== Currency.NGN && !wallet.address) {
      try {
        // For simplicity, we use a shared xpub from config in this phase
        // In a real prod app, each user might have their own or we use a virtual account system
        const xpub = process.env[`TATUM_${currency}_XPUB`];
        if (xpub) {
          // Use wallet ID hash or similar as index for deterministic address generation
          const index = Math.abs(this.hashCode(wallet.id)) % 1000000;
          const address = await this.tatumWallet.generateAddress(currency, xpub, index);
          
          return this.walletService.updateWalletAddress(wallet.id, address);
        }
      } catch (error) {
        // Log error but return the wallet anyway (user can retry address gen later)
        console.error('Failed to generate blockchain address:', error);
      }
    }

    return wallet;
  }

  private hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }
}
