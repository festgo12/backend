import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GiftCardStoreService } from './gift-card-store.service';
import { GiftCardStoreController } from './gift-card-store.controller';
import { AdminGiftCardStoreController } from './admin-gift-card-store.controller';
import { GiftCardStoreWebhookController } from './gift-card-store.webhook.controller';
import { GiftCardStoreEventsHandler } from './gift-card-store.events.handler';
import { ReloadlyClient } from './reloadly.client';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionService } from '../../core/utils/encryption';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => WalletModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    GiftCardStoreController,
    AdminGiftCardStoreController,
    GiftCardStoreWebhookController,
  ],
  providers: [
    GiftCardStoreService,
    ReloadlyClient,
    GiftCardStoreEventsHandler,
    EncryptionService,
  ],
  exports: [GiftCardStoreService],
})
export class GiftCardStoreModule {}
