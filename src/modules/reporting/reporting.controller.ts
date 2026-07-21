import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role } from '@src/generated/client';
import { ReportingService } from './reporting.service';
import { ReportingScheduler } from './reporting.scheduler';

const VALID_CATEGORIES = [
  'revenue',
  'trading-volume',
  'deposits',
  'withdrawals',
  'gift-cards',
  'user-growth',
  'disputes',
  'fraud',
];

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/reports')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly reportingScheduler: ReportingScheduler,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get report overview with all categories' })
  getOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getOverview(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('live')
  @ApiOperation({ summary: 'Get real-time stats for current day' })
  getLiveStats() {
    return this.reportingService.getLiveStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  getRevenue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'revenue',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('trading-volume')
  @ApiOperation({ summary: 'Get trading volume report' })
  getTradingVolume(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'trading-volume',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('deposits')
  @ApiOperation({ summary: 'Get deposits report' })
  getDeposits(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'deposits',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawals report' })
  getWithdrawals(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'withdrawals',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('gift-cards')
  @ApiOperation({ summary: 'Get gift cards report' })
  getGiftCards(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'gift-cards',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth report' })
  getUserGrowth(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'user-growth',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Get disputes report' })
  getDisputes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'disputes',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('fraud')
  @ApiOperation({ summary: 'Get fraud events report' })
  getFraud(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getReportByCategory(
      'fraud',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export report data as CSV' })
  async exportCsv(
    @Query('category') category: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const { headers, rows } = await this.reportingService.getExportData(
      category as any,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return { filename: `${category}-report.csv`, contentType: 'text/csv', content: csvContent };
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export report data as PDF-ready JSON' })
  async exportPdf(
    @Query('category') category: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const { headers, rows } = await this.reportingService.getExportData(
      category as any,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );

    const summary = await this.reportingService.getReportByCategory(
      category as any,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
    );

    return {
      title: `${category.replace(/-/g, ' ').toUpperCase()} REPORT`,
      dateRange: { startDate, endDate },
      headers,
      rows,
      summary: summary.summary,
    };
  }

  @Post('generate/:date')
  @ApiOperation({ summary: 'Manually generate report for a specific date (backfill)' })
  async generateForDate(@Param('date') date: string) {
    await this.reportingScheduler.generateReportForDate(date);
    return { success: true, message: `Report generated for ${date}` };
  }
}
