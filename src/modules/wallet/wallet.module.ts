import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { PaystackService } from './paystack.service';
import { TatumService } from './tatum.service';
import { WalletController } from './wallet.controller';
import { WalletEventsHandler } from './wallet_events.handler';

@Module({
  imports: [HttpModule],
  controllers: [WalletController],
  providers: [WalletService, LedgerService, PaystackService, TatumService, WalletEventsHandler],
  exports: [WalletService, LedgerService, PaystackService, TatumService],
})
export class WalletModule {}
