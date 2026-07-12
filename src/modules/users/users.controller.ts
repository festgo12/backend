import { Controller, Get, Patch, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@GetUser('id') userId: string) {
    return this.usersService.findMe(userId);
  }

  @Patch('profile')
  @AuditLog('USER_PROFILE_UPDATE', 'USER')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@GetUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(@GetUser('id') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(userId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get logged in devices' })
  getDevices(@GetUser('id') userId: string) {
    return this.usersService.getDevices(userId);
  }

  @Delete('devices/:id')
  @AuditLog('SECURITY_DEVICE_REMOVE', 'DEVICE')
  @ApiOperation({ summary: 'Remove a device session' })
  removeDevice(@GetUser('id') userId: string, @Param('id') deviceId: string) {
    return this.usersService.removeDevice(userId, deviceId);
  }
}
