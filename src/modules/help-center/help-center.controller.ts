import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role } from '@src/generated/client';
import { HelpCenterService } from './help-center.service';

@ApiTags('Help Center')
@Controller('help')
export class HelpCenterController {
  constructor(private readonly helpService: HelpCenterService) {}

  @Get('content')
  @ApiOperation({ summary: 'Get public help content (FAQ + contact info)' })
  getContent() {
    return this.helpService.getPublicContent();
  }

  @Get('admin/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all help content (admin)' })
  getAllContent() {
    return this.helpService.getAllContent();
  }

  @Post('admin/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create help content item' })
  createItem(@Body() body: { category: string; title: string; content: string; sortOrder?: number; active?: boolean }) {
    return this.helpService.createItem(body);
  }

  @Patch('admin/content/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update help content item' })
  updateItem(@Param('id') id: string, @Body() body: { category?: string; title?: string; content?: string; sortOrder?: number; active?: boolean }) {
    return this.helpService.updateItem(id, body);
  }

  @Delete('admin/content/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete help content item' })
  deleteItem(@Param('id') id: string) {
    return this.helpService.deleteItem(id);
  }
}
