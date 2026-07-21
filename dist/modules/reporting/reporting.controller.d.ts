import { ReportingService } from './reporting.service';
import { ReportingScheduler } from './reporting.scheduler';
export declare class ReportingController {
    private readonly reportingService;
    private readonly reportingScheduler;
    constructor(reportingService: ReportingService, reportingScheduler: ReportingScheduler);
    getOverview(startDate: string, endDate: string): Promise<import("./reporting.service").ReportOverview>;
    getLiveStats(): Promise<Record<string, number>>;
    getRevenue(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getTradingVolume(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getDeposits(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getWithdrawals(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getGiftCards(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getUserGrowth(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getDisputes(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getFraud(startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    exportCsv(category: string, startDate: string, endDate: string): Promise<{
        filename: string;
        contentType: string;
        content: string;
    }>;
    exportPdf(category: string, startDate: string, endDate: string): Promise<{
        title: string;
        dateRange: {
            startDate: string;
            endDate: string;
        };
        headers: string[];
        rows: any[];
        summary: Record<string, number>;
    }>;
    generateForDate(date: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
