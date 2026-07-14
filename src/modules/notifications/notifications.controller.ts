import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationsQueue } from './notifications.queue';
import { Role } from '@src/generated/client';
import type { User } from '@src/generated/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsQueue: NotificationsQueue,
  ) { }

  // --- User Endpoints ---

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for the logged-in user' })
  async getMyNotifications(
    @GetUser() user: User,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.notificationsService.getNotifications(user.id, limit, offset);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an in-app notification context as read' })
  async markAsRead(@GetUser() user: User, @Param('id') id: string) {
    await this.notificationsService.markAsRead(user.id, id);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  async markAllAsRead(@GetUser() user: User) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update FCM push notification token' })
  async registerFcmToken(
    @GetUser() user: User,
    @Body('deviceId') deviceId: string,
    @Body('fcmToken') fcmToken: string,
  ) {
    if (!deviceId || !fcmToken) {
      return { success: false, message: 'deviceId and fcmToken are required.' };
    }
    await this.notificationsService.registerFcmToken(user.id, deviceId, fcmToken);
    return { success: true };
  }

  // --- Admin Endpoints ---

  @Get('admin/logs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'System notification logs' })
  async getSystemLogs(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.notificationsService.getLogs(limit, offset);
  }

  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'System templates configuration list' })
  async getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Post('admin/templates/:type')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modify template configuration' })
  async updateTemplate(
    @Param('type') type: string,
    @Body() body: Record<string, any>,
  ) {
    return this.notificationsService.createOrUpdateTemplate(type, body);
  }

  @Post('admin/logs/:id/resend')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend failed notification' })
  async resendNotification(@Param('id') id: string) {
    await this.notificationsQueue.resend(id);
    return { success: true };
  }
}
