import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
import { TatumDepositService } from '../tatum/tatum-deposit.service';
import { TatumWebhookService } from '../tatum/tatum-webhook.service';
import { UserStatus, Role } from '@src/generated/client';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exchangeRateService: TatumExchangeRateService,
    private readonly depositService: TatumDepositService,
    private readonly webhookService: TatumWebhookService,
  ) {}

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
  @AuditLog('ADMIN_USER_STATUS_UPDATE', 'USER')
  @ApiOperation({ summary: 'Update user account status' })
  updateUserStatus(@Param('id') userId: string, @Body('status') status: UserStatus) {
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

  @Post('blockchain/failed/:id/retry')
  @AuditLog('ADMIN_RETRY_WITHDRAWAL', 'TRANSACTION')
  @ApiOperation({ summary: 'Retry a failed withdrawal transaction' })
  retryFailedTransaction(@Param('id') transactionId: string) {
    return this.adminService.retryFailedTransaction(transactionId);
  }

  @Post('blockchain/sync')
  @AuditLog('ADMIN_BALANCE_SYNC', 'WALLET')
  @ApiOperation({ summary: 'Trigger balance sync for all crypto wallets' })
  async syncAllBalances() {
    return this.depositService.syncAllWallets();
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
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPaymentTransactions(parseInt(page), parseInt(limit), {
      search, status, type, startDate, endDate,
    });
  }

  @Get('payments/transactions/:id')
  @ApiOperation({ summary: 'Get detailed payment transaction info' })
  getPaymentTransactionDetail(@Param('id') transactionId: string) {
    return this.adminService.getPaymentTransactionDetail(transactionId);
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  getExchangeRates() {
    return this.exchangeRateService.getRateInfo();
  }

  @Post('exchange-rates/refresh')
  @AuditLog('ADMIN_REFRESH_RATES', 'SYSTEM')
  @ApiOperation({ summary: 'Manually refresh exchange rates from CoinGecko' })
  async refreshExchangeRates() {
    const rates = await this.exchangeRateService.refreshRates();
    return {
      success: true,
      rates,
      lastUpdated: this.exchangeRateService.getLastUpdated(),
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with optional filters' })
  getAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAuditLogs(
      parseInt(page),
      parseInt(limit),
      { action, resource, userId, success, startDate, endDate, search },
    );
  }

  @Get('audit-logs/stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getAuditStats() {
    return this.adminService.getAuditStats();
  }

  @Get('audit-logs/user/:userId')
  @ApiOperation({ summary: 'Get audit trail for a specific user' })
  getUserAuditTrail(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getUserAuditTrail(userId, parseInt(page), parseInt(limit));
  }

  // ─── Webhook Subscription Management ──────────────────────────────────────

  @Get('webhooks')
  @ApiOperation({ summary: 'List active Tatum webhook subscriptions' })
  getWebhookSubscriptions() {
    return this.webhookService.getSubscriptionSummary();
  }

  @Post('webhooks/init')
  @AuditLog('ADMIN_WEBHOOK_INIT', 'SYSTEM')
  @ApiOperation({ summary: 'Register outgoing webhooks for all chains' })
  async initOutgoingWebhooks() {
    await this.webhookService.ensureOutgoingWebhooks();
    return { success: true, message: 'Outgoing webhooks initialized for all chains' };
  }

  @Post('webhooks/cancel/:id')
  @AuditLog('ADMIN_WEBHOOK_CANCEL', 'SYSTEM')
  @ApiOperation({ summary: 'Cancel a Tatum webhook subscription' })
  async cancelWebhook(@Param('id') subscriptionId: string) {
    const success = await this.webhookService.cancelSubscription(subscriptionId);
    return { success, message: success ? 'Subscription cancelled' : 'Failed to cancel subscription' };
  }
}
