import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UserStatus, Role } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('users')
  @ApiOperation({ summary: 'Get list of users with pagination' })
  getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(parseInt(page), parseInt(limit), search);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user account status' })
  updateUserStatus(
    @Param('id') userId: string,
    @Body('status') status: UserStatus,
  ) {
    return this.adminService.updateUserStatus(userId, status);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed user information' })
  getUserDetail(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Get('wallets')
  @ApiOperation({ summary: 'List all user wallets' })
  getAllWallets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllWallets(parseInt(page), parseInt(limit), search);
  }

  @Get('wallets/:id')
  @ApiOperation({ summary: 'Get wallet details with history' })
  getWalletDetail(@Param('id') walletId: string) {
    return this.adminService.getWalletDetail(walletId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List platform transactions' })
  getAllTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getAllTransactions(parseInt(page), parseInt(limit));
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all platform orders' })
  getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllOrders(parseInt(page), parseInt(limit), search);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get detailed order information' })
  getOrderDetail(@Param('id') orderId: string) {
    return this.adminService.getOrderDetail(orderId);
  }

  @Get('blockchain/stats')
  @ApiOperation({ summary: 'Get blockchain monitoring stats' })
  getBlockchainStats() {
    return this.adminService.getBlockchainStats();
  }

  @Get('blockchain/transactions')
  @ApiOperation({ summary: 'Monitor blockchain transactions' })
  getBlockchainTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getBlockchainTransactions(parseInt(page), parseInt(limit));
  }

  @Get('blockchain/failed')
  @ApiOperation({ summary: 'List failed transactions' })
  getFailedTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getFailedTransactions(parseInt(page), parseInt(limit));
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Get NGN payment statistics' })
  getPaymentStats() {
    return this.adminService.getPaymentStats();
  }

  @Get('payments/transactions')
  @ApiOperation({ summary: 'Monitor NGN payment transactions' })
  getPaymentTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getPaymentTransactions(parseInt(page), parseInt(limit));
  }
}

