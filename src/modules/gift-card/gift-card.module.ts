import { Module, forwardRef } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';
import { AdminGiftCardController } from './admin-gift-card.controller';
import { GiftCardEventsHandler } from './gift-card.events.handler';
import { WalletModule } from '../wallet/wallet.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionService } from '../../core/utils/encryption';

@Module({
  imports: [
    forwardRef(() => WalletModule),
    forwardRef(() => UploadModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [GiftCardController, AdminGiftCardController],
  providers: [GiftCardService, GiftCardEventsHandler, EncryptionService],
  exports: [GiftCardService],
})
export class GiftCardModule {}
