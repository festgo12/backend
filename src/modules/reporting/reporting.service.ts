import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export type ReportCategory =
  | 'revenue'
  | 'trading-volume'
  | 'deposits'
  | 'withdrawals'
  | 'gift-cards'
  | 'user-growth'
  | 'disputes'
  | 'fraud';

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

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateDailyReport(date: Date): Promise<void> {
    const dayStart = this.startOfDay(date);
    const dayEnd = this.endOfDay(date);

    const [
      feeAgg,
      tradingAgg,
      orderCounts,
      depositAgg,
      withdrawalAgg,
      giftCardAgg,
      userCounts,
      disputeCounts,
      fraudCount,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { feeAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: ['COMPLETED', 'APPROVED'] }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { fiatAmount: true, cryptoAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _count: { id: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED', wallet: { currency: 'NGN' }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED', wallet: { currency: 'NGN' }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.giftCardOrder.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { totalPaidNgn: true },
        _count: { id: true },
      }),
      this.prisma.user.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _count: { id: true },
      }),
      this.prisma.dispute.groupBy({
        by: ['status'],
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _count: { id: true },
      }),
      this.prisma.securityAlert.count({
        where: { type: { contains: 'FRAUD', mode: 'insensitive' }, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    const totalOrders = orderCounts.reduce((sum, g) => sum + g._count.id, 0);
    const completedOrders = orderCounts.find((g) => g.status === 'COMPLETED')?._count.id || 0;
    const cancelledOrders = orderCounts.find((g) => g.status === 'CANCELLED')?._count.id || 0;

    const newDisputes = disputeCounts.reduce((sum, g) => sum + g._count.id, 0);

    const resolvedDisputes = await this.prisma.dispute.count({
      where: { status: 'RESOLVED', updatedAt: { gte: dayStart, lte: dayEnd } },
    });

    const totalUsers = await this.prisma.user.count({
      where: { createdAt: { lte: dayEnd } },
    });

    await this.prisma.dailyReport.upsert({
      where: { date: dayStart },
      create: {
        date: dayStart,
        platformFeesNgn: feeAgg._sum.feeAmount || 0,
        tradingVolumeNgn: tradingAgg._sum.fiatAmount || 0,
        tradingVolumeUsd: tradingAgg._sum.cryptoAmount || 0,
        totalOrders,
        completedOrders,
        cancelledOrders,
        depositsNgn: depositAgg._sum.amount || 0,
        depositCount: depositAgg._count.id || 0,
        withdrawalsNgn: withdrawalAgg._sum.amount || 0,
        withdrawalCount: withdrawalAgg._count.id || 0,
        giftCardVolumeNgn: giftCardAgg._sum.totalPaidNgn || 0,
        giftCardCount: giftCardAgg._count.id || 0,
        newUsers: userCounts._count.id || 0,
        totalUsers,
        newDisputes,
        resolvedDisputes,
        fraudEvents: fraudCount,
      },
      update: {
        platformFeesNgn: feeAgg._sum.feeAmount || 0,
        tradingVolumeNgn: tradingAgg._sum.fiatAmount || 0,
        tradingVolumeUsd: tradingAgg._sum.cryptoAmount || 0,
        totalOrders,
        completedOrders,
        cancelledOrders,
        depositsNgn: depositAgg._sum.amount || 0,
        depositCount: depositAgg._count.id || 0,
        withdrawalsNgn: withdrawalAgg._sum.amount || 0,
        withdrawalCount: withdrawalAgg._count.id || 0,
        giftCardVolumeNgn: giftCardAgg._sum.totalPaidNgn || 0,
        giftCardCount: giftCardAgg._count.id || 0,
        newUsers: userCounts._count.id || 0,
        totalUsers,
        newDisputes,
        resolvedDisputes,
        fraudEvents: fraudCount,
      },
    });
  }

  async getOverview(startDate: string, endDate: string): Promise<ReportOverview> {
    const start = this.startOfDay(new Date(startDate));
    const end = this.endOfDay(new Date(endDate));

    const series = await this.prisma.dailyReport.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const summary = series.reduce(
      (acc, row) => ({
        platformFeesNgn: acc.platformFeesNgn + Number(row.platformFeesNgn),
        tradingVolumeNgn: acc.tradingVolumeNgn + Number(row.tradingVolumeNgn),
        tradingVolumeUsd: acc.tradingVolumeUsd + Number(row.tradingVolumeUsd),
        totalOrders: acc.totalOrders + row.totalOrders,
        completedOrders: acc.completedOrders + row.completedOrders,
        depositsNgn: acc.depositsNgn + Number(row.depositsNgn),
        depositCount: acc.depositCount + row.depositCount,
        withdrawalsNgn: acc.withdrawalsNgn + Number(row.withdrawalsNgn),
        withdrawalCount: acc.withdrawalCount + row.withdrawalCount,
        giftCardVolumeNgn: acc.giftCardVolumeNgn + Number(row.giftCardVolumeNgn),
        giftCardCount: acc.giftCardCount + row.giftCardCount,
        newUsers: acc.newUsers + row.newUsers,
        totalUsers: row.totalUsers,
        newDisputes: acc.newDisputes + row.newDisputes,
        resolvedDisputes: acc.resolvedDisputes + row.resolvedDisputes,
        fraudEvents: acc.fraudEvents + row.fraudEvents,
      }),
      {
        platformFeesNgn: 0,
        tradingVolumeNgn: 0,
        tradingVolumeUsd: 0,
        totalOrders: 0,
        completedOrders: 0,
        depositsNgn: 0,
        depositCount: 0,
        withdrawalsNgn: 0,
        withdrawalCount: 0,
        giftCardVolumeNgn: 0,
        giftCardCount: 0,
        newUsers: 0,
        totalUsers: 0,
        newDisputes: 0,
        resolvedDisputes: 0,
        fraudEvents: 0,
      },
    );

    return { series, summary };
  }

  async getReportByCategory(
    category: ReportCategory,
    startDate: string,
    endDate: string,
  ): Promise<{ series: any[]; summary: Record<string, number> }> {
    const start = this.startOfDay(new Date(startDate));
    const end = this.endOfDay(new Date(endDate));

    const series = await this.prisma.dailyReport.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const summary = this.computeCategorySummary(category, series);

    return { series, summary };
  }

  async getLiveStats(): Promise<Record<string, number>> {
    const now = new Date();
    const dayStart = this.startOfDay(now);
    const dayEnd = this.endOfDay(now);

    const [
      feeAgg,
      tradingAgg,
      orderCounts,
      depositAgg,
      withdrawalAgg,
      giftCardAgg,
      userCount,
      disputeCount,
      fraudCount,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { feeAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: ['COMPLETED', 'APPROVED'] }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { fiatAmount: true, cryptoAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _count: { id: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED', wallet: { currency: 'NGN' }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED', wallet: { currency: 'NGN' }, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.giftCardOrder.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { totalPaidNgn: true },
        _count: { id: true },
      }),
      this.prisma.user.count({ where: { createdAt: { lte: dayEnd } } }),
      this.prisma.dispute.count({
        where: { status: 'OPEN', createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.securityAlert.count({
        where: { type: { contains: 'FRAUD', mode: 'insensitive' }, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    const totalOrders = orderCounts.reduce((sum, g) => sum + g._count.id, 0);

    return {
      platformFeesNgn: Number(feeAgg._sum.feeAmount || 0),
      tradingVolumeNgn: Number(tradingAgg._sum.fiatAmount || 0),
      tradingVolumeUsd: Number(tradingAgg._sum.cryptoAmount || 0),
      totalOrders,
      completedOrders: orderCounts.find((g) => g.status === 'COMPLETED')?._count.id || 0,
      depositsNgn: Number(depositAgg._sum.amount || 0),
      depositCount: depositAgg._count.id || 0,
      withdrawalsNgn: Number(withdrawalAgg._sum.amount || 0),
      withdrawalCount: withdrawalAgg._count.id || 0,
      giftCardVolumeNgn: Number(giftCardAgg._sum.totalPaidNgn || 0),
      giftCardCount: giftCardAgg._count.id || 0,
      totalUsers: userCount,
      newDisputes: disputeCount,
      fraudEvents: fraudCount,
    };
  }

  async getExportData(
    category: ReportCategory,
    startDate: string,
    endDate: string,
  ): Promise<{ headers: string[]; rows: any[] }> {
    const start = this.startOfDay(new Date(startDate));
    const end = this.endOfDay(new Date(endDate));

    const series = await this.prisma.dailyReport.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    return this.formatExportData(category, series);
  }

  private computeCategorySummary(category: ReportCategory, series: any[]): Record<string, number> {
    switch (category) {
      case 'revenue':
        return {
          totalFeesNgn: series.reduce((s, r) => s + Number(r.platformFeesNgn), 0),
          avgDailyFeesNgn: series.length ? series.reduce((s, r) => s + Number(r.platformFeesNgn), 0) / series.length : 0,
        };
      case 'trading-volume':
        return {
          totalVolumeNgn: series.reduce((s, r) => s + Number(r.tradingVolumeNgn), 0),
          totalVolumeUsd: series.reduce((s, r) => s + Number(r.tradingVolumeUsd), 0),
          totalOrders: series.reduce((s, r) => s + r.totalOrders, 0),
          completedOrders: series.reduce((s, r) => s + r.completedOrders, 0),
        };
      case 'deposits':
        return {
          totalDepositsNgn: series.reduce((s, r) => s + Number(r.depositsNgn), 0),
          totalDepositCount: series.reduce((s, r) => s + r.depositCount, 0),
          avgDailyDepositsNgn: series.length ? series.reduce((s, r) => s + Number(r.depositsNgn), 0) / series.length : 0,
        };
      case 'withdrawals':
        return {
          totalWithdrawalsNgn: series.reduce((s, r) => s + Number(r.withdrawalsNgn), 0),
          totalWithdrawalCount: series.reduce((s, r) => s + r.withdrawalCount, 0),
          avgDailyWithdrawalsNgn: series.length ? series.reduce((s, r) => s + Number(r.withdrawalsNgn), 0) / series.length : 0,
        };
      case 'gift-cards':
        return {
          totalGiftCardVolumeNgn: series.reduce((s, r) => s + Number(r.giftCardVolumeNgn), 0),
          totalGiftCardCount: series.reduce((s, r) => s + r.giftCardCount, 0),
        };
      case 'user-growth':
        return {
          newUsers: series.reduce((s, r) => s + r.newUsers, 0),
          peakTotalUsers: series.length ? Math.max(...series.map((r) => r.totalUsers)) : 0,
        };
      case 'disputes':
        return {
          newDisputes: series.reduce((s, r) => s + r.newDisputes, 0),
          resolvedDisputes: series.reduce((s, r) => s + r.resolvedDisputes, 0),
          resolutionRate: series.reduce((s, r) => s + r.newDisputes, 0) > 0
            ? (series.reduce((s, r) => s + r.resolvedDisputes, 0) / series.reduce((s, r) => s + r.newDisputes, 0)) * 100
            : 0,
        };
      case 'fraud':
        return {
          totalFraudEvents: series.reduce((s, r) => s + r.fraudEvents, 0),
        };
      default:
        return {};
    }
  }

  private formatExportData(category: ReportCategory, series: any[]): { headers: string[]; rows: any[] } {
    const dateHeader = 'Date';

    switch (category) {
      case 'revenue':
        return {
          headers: [dateHeader, 'Platform Fees (NGN)'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], Number(r.platformFeesNgn)]),
        };
      case 'trading-volume':
        return {
          headers: [dateHeader, 'Volume (NGN)', 'Volume (USD)', 'Total Orders', 'Completed Orders'],
          rows: series.map((r) => [
            r.date.toISOString().split('T')[0],
            Number(r.tradingVolumeNgn),
            Number(r.tradingVolumeUsd),
            r.totalOrders,
            r.completedOrders,
          ]),
        };
      case 'deposits':
        return {
          headers: [dateHeader, 'Deposits (NGN)', 'Deposit Count'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], Number(r.depositsNgn), r.depositCount]),
        };
      case 'withdrawals':
        return {
          headers: [dateHeader, 'Withdrawals (NGN)', 'Withdrawal Count'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], Number(r.withdrawalsNgn), r.withdrawalCount]),
        };
      case 'gift-cards':
        return {
          headers: [dateHeader, 'Gift Card Volume (NGN)', 'Gift Card Count'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], Number(r.giftCardVolumeNgn), r.giftCardCount]),
        };
      case 'user-growth':
        return {
          headers: [dateHeader, 'New Users', 'Total Users'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], r.newUsers, r.totalUsers]),
        };
      case 'disputes':
        return {
          headers: [dateHeader, 'New Disputes', 'Resolved Disputes'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], r.newDisputes, r.resolvedDisputes]),
        };
      case 'fraud':
        return {
          headers: [dateHeader, 'Fraud Events'],
          rows: series.map((r) => [r.date.toISOString().split('T')[0], r.fraudEvents]),
        };
      default:
        return { headers: [], rows: [] };
    }
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
