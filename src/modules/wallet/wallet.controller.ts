import { Controller, Get, Post, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { WalletService } from './wallet.service';
import { Currency } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

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
    return this.walletService.getOrCreateWallet(user.id, currency);
  }
}
