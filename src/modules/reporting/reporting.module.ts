import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { ReportingScheduler } from './reporting.scheduler';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ReportingScheduler],
  exports: [ReportingService],
})
export class ReportingModule {}
