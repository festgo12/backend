import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { WalletController } from './wallet.controller';
import { WalletEventsHandler } from './wallet_events.handler';
import { PaystackModule } from '../paystack/paystack.module';

@Module({
  imports: [
    forwardRef(() => PaystackModule),
  ],
  controllers: [WalletController],
  providers: [WalletService, LedgerService, WalletEventsHandler],
  exports: [WalletService, LedgerService],
})
export class WalletModule {}
