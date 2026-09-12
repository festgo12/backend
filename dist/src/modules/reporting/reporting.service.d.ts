import { PrismaService } from '../../core/database/prisma.service';
export type ReportCategory = 'revenue' | 'trading-volume' | 'deposits' | 'withdrawals' | 'gift-cards' | 'user-growth' | 'disputes' | 'fraud';
export interface ReportOverview {
    series: any[];
    summary: {
        platformFeesNgn: number;
        tradingVolumeNgn: number;
        tradingVolumeUsd: number;
        totalOrders: number;
        completedOrders: number;
        depositsNgn: number;
        depositCount: number;
        withdrawalsNgn: number;
        withdrawalCount: number;
        giftCardVolumeNgn: number;
        giftCardCount: number;
        newUsers: number;
        totalUsers: number;
        newDisputes: number;
        resolvedDisputes: number;
        fraudEvents: number;
    };
}
export declare class ReportingService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateDailyReport(date: Date): Promise<void>;
    getOverview(startDate: string, endDate: string): Promise<ReportOverview>;
    getReportByCategory(category: ReportCategory, startDate: string, endDate: string): Promise<{
        series: any[];
        summary: Record<string, number>;
    }>;
    getLiveStats(): Promise<Record<string, number>>;
    getExportData(category: ReportCategory, startDate: string, endDate: string): Promise<{
        headers: string[];
        rows: any[];
    }>;
    private computeCategorySummary;
    private formatExportData;
    private startOfDay;
    private endOfDay;
}
