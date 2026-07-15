import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role } from '@src/generated/client';
import { FraudRulesService } from './fraud-rules.service';
import { RiskEngineService } from './risk-engine.service';
import { AlertEngineService } from './alert-engine.service';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';

@ApiTags('Admin - Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(
    private readonly fraudRulesService: FraudRulesService,
    private readonly riskEngineService: RiskEngineService,
    private readonly alertEngineService: AlertEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('fraud-rules')
  @ApiOperation({ summary: 'List all fraud rules' })
  getFraudRules() {
    return this.fraudRulesService.getAllRules();
  }

  @Patch('fraud-rules/:id')
  @ApiOperation({ summary: 'Update a fraud rule' })
  updateFraudRule(@Param('id') ruleId: string, @Body() dto: UpdateFraudRuleDto) {
    return this.fraudRulesService.updateRule(ruleId, dto);
  }

  @Get('risk-overview')
  @ApiOperation({ summary: 'Get risk analytics overview for admin dashboard' })
  getRiskOverview() {
    return this.riskEngineService.getAdminRiskOverview();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'List all security alerts across all users (admin)' })
  async getAllAlerts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('severity') severity?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, any> = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [alerts, total] = await Promise.all([
      this.prisma.securityAlert.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.securityAlert.count({ where }),
    ]);

    return {
      alerts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Get alert statistics across all users' })
  async getAlertStats() {
    const [total, unread, bySeverity, byType] = await Promise.all([
      this.prisma.securityAlert.count(),
      this.prisma.securityAlert.count({ where: { isRead: false } }),
      this.prisma.securityAlert.groupBy({
        by: ['severity'],
        _count: { severity: true },
      }),
      this.prisma.securityAlert.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      unread,
      bySeverity: bySeverity.map((s) => ({
        severity: s.severity,
        count: s._count.severity,
      })),
      topTypes: byType.map((t) => ({
        type: t.type,
        count: t._count.type,
      })),
    };
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: 'Mark an alert as read' })
  async markAlertAsRead(@Param('id') alertId: string) {
    return this.prisma.securityAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }
}
