import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { AdminDisputesController } from './admin-disputes.controller';
import { DisputesEventsHandler } from './disputes.events.handler';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [UploadModule, NotificationsModule, WalletModule],
  controllers: [DisputesController, AdminDisputesController],
  providers: [DisputesService, DisputesEventsHandler],
  exports: [DisputesService],
})
export class DisputesModule {}
