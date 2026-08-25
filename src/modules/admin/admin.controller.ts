import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { PlatformService } from '../crypto/platform.service';
import { UserStatus, Role, Currency } from '@src/generated/client';
import { AuditLog } from '../audit/audit.decorator';
import { AdminUpdateAdDto, SweepFeeWalletDto, CreditTestFundsDto, UpdateFeeConfigDto } from './dto/admin-operations.dto';
import { clampPagination } from '../../core/utils/pagination';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly platformService: PlatformService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated dashboard stats' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Users ──────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Get list of users with pagination' })
  getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const p = clampPagination(page, limit);
    return this.adminService.getUsers(p.page, p.limit, search);
  }

  @Patch('users/:id/status')
  @AuditLog('ADMIN_USER_STATUS_UPDATE', 'USER')
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
    const p = clampPagination(page, limit);
    return this.adminService.getAllWallets(p.page, p.limit, search);
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
    const p = clampPagination(page, limit);
    return this.adminService.getAllTransactions(p.page, p.limit);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all platform orders' })
  getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const p = clampPagination(page, limit);
    return this.adminService.getAllOrders(p.page, p.limit, search);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get detailed order information' })
  getOrderDetail(@Param('id') orderId: string) {
    return this.adminService.getOrderDetail(orderId);
  }

  @Patch('orders/:id/flag')
  @AuditLog('ADMIN_ORDER_FLAG', 'ORDER')
  @ApiOperation({ summary: 'Flag order for fraud review' })
  flagOrder(@Param('id') orderId: string) {
    return this.adminService.flagOrder(orderId);
  }

  @Patch('orders/:id/release')
  @AuditLog('ADMIN_ORDER_RELEASE', 'ORDER')
  @ApiOperation({ summary: 'Remove fraud flag from order' })
  releaseOrder(@Param('id') orderId: string) {
    return this.adminService.releaseOrder(orderId);
  }

  // ─── Admin Ad Moderation ─────────────────────────────────────────────

  @Patch('ads/:id')
  @AuditLog('ADMIN_AD_UPDATE', 'MARKETPLACE')
  @ApiOperation({ summary: 'Admin update any ad (moderation)' })
  adminUpdateAd(
    @Param('id') adId: string,
    @Body() dto: AdminUpdateAdDto,
  ) {
    return this.adminService.adminUpdateAd(adId, dto as Record<string, unknown>);
  }

  @Delete('ads/:id')
  @AuditLog('ADMIN_AD_DELETE', 'MARKETPLACE')
  @ApiOperation({ summary: 'Admin delete any ad (moderation)' })
  adminDeleteAd(@Param('id') adId: string) {
    return this.adminService.adminDeleteAd(adId);
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
    const p = clampPagination(page, limit);
    return this.adminService.getBlockchainTransactions(p.page, p.limit);
  }

  @Get('blockchain/failed')
  @ApiOperation({ summary: 'List failed transactions' })
  getFailedTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const p = clampPagination(page, limit);
    return this.adminService.getFailedTransactions(p.page, p.limit);
  }

  @Post('blockchain/failed/:id/retry')
  @AuditLog('ADMIN_RETRY_WITHDRAWAL', 'TRANSACTION')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retry a failed withdrawal transaction' })
  retryFailedTransaction(@Param('id') transactionId: string) {
    return this.adminService.retryFailedTransaction(transactionId);
  }

  // ─── Crypto Monitoring (Phase 6) ─────────────────────────────────────────

  @Get('crypto/status')
  @ApiOperation({
    summary:
      'Hybrid webhook crypto system status (providers, registry, sweeps)',
  })
  getCryptoSystemStatus() {
    return this.adminService.getCryptoSystemStatus();
  }

  @Get('crypto/withdrawal-jobs')
  @ApiOperation({ summary: 'List withdrawal confirmation jobs' })
  getWithdrawalJobs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const p = clampPagination(page, limit, { maxLimit: 50 });
    return this.adminService.getWithdrawalJobs(p.page, p.limit, status);
  }

  @Get('crypto/chain-balances')
  @ApiOperation({
    summary: 'Live on-chain balances of the platform master wallets',
  })
  getChainBalances() {
    return this.adminService.getChainBalances();
  }

  // ─── Reconciliation ────────────────────────────────────────────────────

  @Post('crypto/reconcile')
  @AuditLog('ADMIN_CRYPTO_RECONCILE', 'SYSTEM')
  @ApiOperation({ summary: 'Run full on-chain reconciliation (all chains)' })
  reconcileAll() {
    return this.adminService.reconcileAll();
  }

  @Post('crypto/reconcile/:currency')
  @AuditLog('ADMIN_CRYPTO_RECONCILE_CURRENCY', 'SYSTEM')
  @ApiOperation({
    summary: 'Run on-chain reconciliation for a specific currency',
  })
  reconcileCurrency(@Param('currency') currency: Currency) {
    return this.adminService.reconcileCurrency(currency);
  }

  // ─── Sweep ──────────────────────────────────────────────────────────────

  @Post('crypto/sweep-all')
  @AuditLog('ADMIN_CRYPTO_SWEEP_ALL', 'SYSTEM')
  @ApiOperation({
    summary: 'Trigger manual sweep of all deposit addresses to master wallet',
  })
  sweepAll() {
    return this.adminService.triggerSweepAll();
  }

  // ─── On-Chain History ──────────────────────────────────────────────────

  @Get('crypto/btc-history')
  @ApiOperation({
    summary: 'Fetch BTC on-chain history (xpub) with DB match status',
  })
  getBtcHistory(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = clampPagination(page, pageSize, { maxLimit: 100 });
    return this.adminService.getBtcHistory(p.page, p.limit);
  }

  @Get('crypto/evm-history/:address')
  @ApiOperation({
    summary:
      'Fetch EVM on-chain history for a specific address with DB match status',
  })
  getEvmHistory(
    @Param('address') address: string,
    @Query('page') page?: string,
  ) {
    const p = clampPagination(page, '50');
    return this.adminService.getEvmHistory(address, p.page);
  }

  // ─── Platform Fee Wallets ─────────────────────────────────────────────────

  @Get('fee-wallets')
  @ApiOperation({ summary: 'List platform fee wallets with ledger balances' })
  getFeeWallets() {
    return this.adminService.getFeeWallets();
  }

  @Post('fee-wallets/init')
  @AuditLog('ADMIN_FEE_WALLET_INIT', 'WALLET')
  @ApiOperation({
    summary: 'Create/assign the platform fee wallets for all crypto currencies',
  })
  async initFeeWallets() {
    const result = await this.platformService.ensurePlatformWallets();
    return {
      success: true,
      userId: result.userId,
      wallets: result.wallets,
    };
  }

  @Post('fee-wallets/:currency/sweep')
  @AuditLog('ADMIN_FEE_SWEEP', 'WALLET')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Sweep platform fee wallet balance to a treasury address',
  })
  sweepFeeWallet(
    @Param('currency') currency: Currency,
    @Body() dto: SweepFeeWalletDto,
  ) {
    return this.adminService.sweepFeeWallet(currency, dto.address, dto.amount);
  }

  @Post('testnet/credit')
  @AuditLog('ADMIN_TESTNET_CREDIT', 'WALLET')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Credit a user wallet with test funds (testnet environments only)',
  })
  creditTestFunds(@Body() dto: CreditTestFundsDto) {
    return this.adminService.creditTestFunds(dto.email, dto.currency, dto.amount);
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
    const p = clampPagination(page, limit);
    return this.adminService.getPaymentTransactions(p.page, p.limit, {
      search,
      status,
      type,
      startDate,
      endDate,
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
    const p = clampPagination(page, limit);
    return this.adminService.getAuditLogs(p.page, p.limit, {
      action,
      resource,
      userId,
      success,
      startDate,
      endDate,
      search,
    });
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
    const p = clampPagination(page, limit);
    return this.adminService.getUserAuditTrail(
      userId,
      p.page,
      p.limit,
    );
  }

  // ─── Fee Configuration ─────────────────────────────────────────────────────

  @Get('fees')
  @ApiOperation({ summary: 'Get all platform fee configurations' })
  getFeeConfigs() {
    return this.adminService.getFeeConfigs();
  }

  @Patch('fees/:key')
  @AuditLog('ADMIN_FEE_UPDATE', 'PLATFORM_CONFIG')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a platform fee configuration' })
  updateFeeConfig(@Param('key') key: string, @Body() dto: UpdateFeeConfigDto) {
    return this.adminService.updateFeeConfig(key, dto.value);
  }
}
