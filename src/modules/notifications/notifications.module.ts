import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { NotificationsQueue } from './notifications.queue';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [
    NotificationsService,
    EmailService,
    FcmService,
    NotificationsQueue,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
