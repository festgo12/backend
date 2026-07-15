import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityService } from './security.service';
import { FraudRulesService } from './fraud-rules.service';
import { RiskEngineService } from './risk-engine.service';
import { AlertEngineService } from './alert-engine.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly fraudRulesService: FraudRulesService,
    private readonly riskEngineService: RiskEngineService,
    private readonly alertEngineService: AlertEngineService,
  ) {}

  // --- Devices ---

  @Get('devices')
  @ApiOperation({ summary: 'List all devices for the current user' })
  getDevices(@Request() req) {
    return this.securityService.getUserDevices(req.user.id);
  }

  @Delete('devices/:id')
  @AuditLog('SECURITY_DEVICE_REMOVE', 'DEVICE')
  @ApiOperation({ summary: 'Remove a device' })
  removeDevice(@Request() req, @Param('id') deviceId: string) {
    return this.securityService.removeDevice(req.user.id, deviceId);
  }

  @Delete('devices')
  @AuditLog('SECURITY_DEVICES_REMOVE_ALL', 'DEVICE')
  @ApiOperation({ summary: 'Remove all other devices (keep current)' })
  removeAllDevices(@Request() req) {
    return this.securityService.removeAllDevices(req.user.id);
  }

  // --- Sessions ---

  @Get('sessions')
  @ApiOperation({ summary: 'List all active sessions' })
  getSessions(@Request() req) {
    return this.securityService.getUserSessions(req.user.id);
  }

  @Delete('sessions/:id')
  @AuditLog('SECURITY_SESSION_REVOKE', 'SESSION')
  @ApiOperation({ summary: 'Revoke a session' })
  revokeSession(@Request() req, @Param('id') tokenId: string) {
    return this.securityService.revokeSession(req.user.id, tokenId);
  }

  @Delete('sessions')
  @AuditLog('SECURITY_SESSIONS_REVOKE_ALL', 'SESSION')
  @ApiOperation({ summary: 'Revoke all other sessions' })
  revokeAllSessions(@Request() req) {
    return this.securityService.revokeAllSessions(req.user.id);
  }

  // --- Alerts ---

  @Get('alerts')
  @ApiOperation({ summary: 'List security alerts' })
  getAlerts(@Request() req, @Query() query: QueryAlertsDto) {
    return this.securityService.getUserAlerts(req.user.id, query);
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: 'Mark an alert as read' })
  markAlertRead(@Request() req, @Param('id') alertId: string) {
    return this.securityService.markAlertAsRead(req.user.id, alertId);
  }

  @Patch('alerts/read-all')
  @ApiOperation({ summary: 'Mark all alerts as read' })
  markAllAlertsRead(@Request() req) {
    return this.securityService.markAllAlertsAsRead(req.user.id);
  }

  @Get('alerts/unread-count')
  @ApiOperation({ summary: 'Get unread alert count' })
  getUnreadCount(@Request() req) {
    return this.securityService.getUnreadAlertCount(req.user.id);
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  getAlertStats(@Request() req) {
    return this.alertEngineService.getAlertStats(req.user.id);
  }

  // --- Security Score ---

  @Get('score')
  @ApiOperation({ summary: 'Get security score for current user' })
  getSecurityScore(@Request() req) {
    return this.securityService.getSecurityScore(req.user.id);
  }

  // --- Risk Assessment ---

  @Get('risk')
  @ApiOperation({ summary: 'Get personal risk assessment' })
  getRiskScore(@Request() req) {
    return this.riskEngineService.calculateUserRiskScore(req.user.id);
  }
}
