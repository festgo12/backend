import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role, DisputeStatus } from '@src/generated/client';
import { AuditLog } from '../audit/audit.decorator';
import { DisputesService } from './disputes.service';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AssignDisputeDto } from './dto/assign-dispute.dto';

@ApiTags('Admin - Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'List all disputes with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: DisputeStatus })
  @ApiQuery({ name: 'assigneeId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: DisputeStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.disputesService.listAllDisputes(
      { status, assigneeId, startDate, endDate, search },
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dispute statistics' })
  getStats() {
    return this.disputesService.getDisputeStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed dispute information' })
  findOne(@Param('id') id: string) {
    return this.disputesService.getDisputeAdmin(id);
  }

  @Patch(':id/status')
  @AuditLog('DISPUTE_STATUS_CHANGED', 'DISPUTE')
  @ApiOperation({ summary: 'Update dispute status' })
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateDisputeStatus(
      id,
      dto.status,
      req.user.id,
      dto.reason,
    );
  }

  @Patch(':id/assign')
  @AuditLog('DISPUTE_ASSIGNED', 'DISPUTE')
  @ApiOperation({ summary: 'Assign dispute to an admin' })
  assign(@Param('id') id: string, @Body() dto: AssignDisputeDto) {
    return this.disputesService.assignDispute(id, dto.assigneeId);
  }

  @Patch(':id/resolve')
  @AuditLog('DISPUTE_RESOLVED', 'DISPUTE')
  @ApiOperation({ summary: 'Resolve or reject a dispute' })
  resolve(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(
      id,
      dto.resolution,
      dto.outcome || DisputeStatus.RESOLVED,
      req.user.id,
    );
  }

  @Patch(':id/freeze-order')
  @AuditLog('ORDER_FROZEN', 'ORDER')
  @ApiOperation({ summary: 'Freeze the associated order' })
  freezeOrder(@Param('id') id: string, @Request() req) {
    return this.disputesService.freezeOrder(id, req.user.id);
  }
}
