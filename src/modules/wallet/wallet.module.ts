import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { WalletController } from './wallet.controller';
import { WalletEventsHandler } from './wallet_events.handler';
import { WalletNotificationsHandler } from './wallet-notifications.handler';
import { PaystackModule } from '../paystack/paystack.module';
import { SecurityModule } from '../security/security.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => PaystackModule), SecurityModule, NotificationsModule],
  controllers: [WalletController],
  providers: [WalletService, LedgerService, WalletEventsHandler, WalletNotificationsHandler],
  exports: [WalletService, LedgerService],
})
export class WalletModule {}
