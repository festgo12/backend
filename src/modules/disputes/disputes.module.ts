import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { AdminDisputesController } from './admin-disputes.controller';
import { DisputesEventsHandler } from './disputes.events.handler';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [DisputesController, AdminDisputesController],
  providers: [DisputesService, DisputesEventsHandler],
  exports: [DisputesService],
})
export class DisputesModule {}
