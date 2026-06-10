import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { Currency } from '@prisma/client';

@Injectable()
export class WalletEventsHandler {
  constructor(private readonly walletService: WalletService) {}

  @OnEvent('user.created')
  async handleUserCreated(payload: { userId: string; email?: string }) {
    // Automatically create a default NGN wallet for every new user
    await this.walletService.getOrCreateWallet(payload.userId, Currency.NGN);
    
    // We could also trigger Tatum wallet generation here in Phase 2
  }
}
