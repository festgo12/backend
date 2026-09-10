import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GiftCardStoreService } from './gift-card-store.service';
import { GiftCardStoreController } from './gift-card-store.controller';
import { AdminGiftCardStoreController } from './admin-gift-card-store.controller';
import { GiftCardStoreEventsHandler } from './gift-card-store.events.handler';
import { GiftbitClient } from './giftbit.client';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => WalletModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [GiftCardStoreController, AdminGiftCardStoreController],
  providers: [GiftCardStoreService, GiftbitClient, GiftCardStoreEventsHandler],
  exports: [GiftCardStoreService],
})
export class GiftCardStoreModule {}
