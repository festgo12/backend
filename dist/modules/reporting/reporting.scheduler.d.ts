import { ReportingService } from './reporting.service';
export declare class ReportingScheduler {
    private readonly reportingService;
    private readonly logger;
    constructor(reportingService: ReportingService);
    handleDailyReportGeneration(): Promise<void>;
    generateReportForDate(dateStr: string): Promise<void>;
}
