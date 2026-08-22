import {
  Controller,
  Get,
  Patch,
  Post,
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
    return this.adminService.getAllWallets(
      parseInt(page),
      parseInt(limit),
      search,
    );
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
    return this.adminService.getAllTransactions(
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all platform orders' })
  getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllOrders(
      parseInt(page),
      parseInt(limit),
      search,
    );
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
    return this.adminService.getBlockchainTransactions(
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('blockchain/failed')
  @ApiOperation({ summary: 'List failed transactions' })
  getFailedTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getFailedTransactions(
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('blockchain/failed/:id/retry')
  @AuditLog('ADMIN_RETRY_WITHDRAWAL', 'TRANSACTION')
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
    return this.adminService.getWithdrawalJobs(
      parseInt(page),
      parseInt(limit),
      status,
    );
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
    return this.adminService.getBtcHistory(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
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
    return this.adminService.getEvmHistory(
      address,
      page ? parseInt(page, 10) : 1,
    );
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
  @ApiOperation({
    summary: 'Sweep platform fee wallet balance to a treasury address',
  })
  sweepFeeWallet(
    @Param('currency') currency: Currency,
    @Body('address') address: string,
    @Body('amount') amount?: number,
  ) {
    return this.adminService.sweepFeeWallet(currency, address, amount);
  }

  @Post('testnet/credit')
  @AuditLog('ADMIN_TESTNET_CREDIT', 'WALLET')
  @ApiOperation({
    summary: 'Credit a user wallet with test funds (testnet environments only)',
  })
  creditTestFunds(
    @Body('email') email: string,
    @Body('currency') currency: Currency,
    @Body('amount') amount: number,
  ) {
    return this.adminService.creditTestFunds(email, currency, amount);
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
    return this.adminService.getPaymentTransactions(
      parseInt(page),
      parseInt(limit),
      {
        search,
        status,
        type,
        startDate,
        endDate,
      },
    );
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
    return this.adminService.getAuditLogs(parseInt(page), parseInt(limit), {
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
    return this.adminService.getUserAuditTrail(
      userId,
      parseInt(page),
      parseInt(limit),
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
  @ApiOperation({ summary: 'Update a platform fee configuration' })
  updateFeeConfig(@Param('key') key: string, @Body('value') value: number) {
    return this.adminService.updateFeeConfig(key, value);
  }
}
