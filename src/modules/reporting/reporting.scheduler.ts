import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportingService } from './reporting.service';

@Injectable()
export class ReportingScheduler {
  private readonly logger = new Logger(ReportingScheduler.name);

  constructor(private readonly reportingService: ReportingService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyReportGeneration() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    this.logger.log(`Generating daily report for ${yesterday.toISOString().split('T')[0]}`);

    try {
      await this.reportingService.generateDailyReport(yesterday);
      this.logger.log(`Daily report generated successfully for ${yesterday.toISOString().split('T')[0]}`);
    } catch (error) {
      this.logger.error(`Failed to generate daily report for ${yesterday.toISOString().split('T')[0]}`, error);
    }
  }

  async generateReportForDate(dateStr: string): Promise<void> {
    const date = new Date(dateStr);
    await this.reportingService.generateDailyReport(date);
  }
}
