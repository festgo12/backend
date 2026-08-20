"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const admin_service_1 = require("./admin.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const platform_service_1 = require("../crypto/platform.service");
const client_1 = require("../../generated/client/index.js");
const audit_decorator_1 = require("../audit/audit.decorator");
let AdminController = class AdminController {
    adminService;
    exchangeRateService;
    platformService;
    constructor(adminService, exchangeRateService, platformService) {
        this.adminService = adminService;
        this.exchangeRateService = exchangeRateService;
        this.platformService = platformService;
    }
    getUsers(page = '1', limit = '10', search) {
        return this.adminService.getUsers(parseInt(page), parseInt(limit), search);
    }
    updateUserStatus(userId, status) {
        return this.adminService.updateUserStatus(userId, status);
    }
    getUserDetail(userId) {
        return this.adminService.getUserDetail(userId);
    }
    getAllWallets(page = '1', limit = '10', search) {
        return this.adminService.getAllWallets(parseInt(page), parseInt(limit), search);
    }
    getWalletDetail(walletId) {
        return this.adminService.getWalletDetail(walletId);
    }
    getAllTransactions(page = '1', limit = '10') {
        return this.adminService.getAllTransactions(parseInt(page), parseInt(limit));
    }
    getAllOrders(page = '1', limit = '10', search) {
        return this.adminService.getAllOrders(parseInt(page), parseInt(limit), search);
    }
    getOrderDetail(orderId) {
        return this.adminService.getOrderDetail(orderId);
    }
    getBlockchainStats() {
        return this.adminService.getBlockchainStats();
    }
    getBlockchainTransactions(page = '1', limit = '10') {
        return this.adminService.getBlockchainTransactions(parseInt(page), parseInt(limit));
    }
    getFailedTransactions(page = '1', limit = '10') {
        return this.adminService.getFailedTransactions(parseInt(page), parseInt(limit));
    }
    retryFailedTransaction(transactionId) {
        return this.adminService.retryFailedTransaction(transactionId);
    }
    getCryptoSystemStatus() {
        return this.adminService.getCryptoSystemStatus();
    }
    getWithdrawalJobs(page = '1', limit = '20', status) {
        return this.adminService.getWithdrawalJobs(parseInt(page), parseInt(limit), status);
    }
    getChainBalances() {
        return this.adminService.getChainBalances();
    }
    reconcileAll() {
        return this.adminService.reconcileAll();
    }
    reconcileCurrency(currency) {
        return this.adminService.reconcileCurrency(currency);
    }
    getFeeWallets() {
        return this.adminService.getFeeWallets();
    }
    async initFeeWallets() {
        const result = await this.platformService.ensurePlatformWallets();
        return {
            success: true,
            userId: result.userId,
            wallets: result.wallets,
        };
    }
    sweepFeeWallet(currency, address, amount) {
        return this.adminService.sweepFeeWallet(currency, address, amount);
    }
    creditTestFunds(email, currency, amount) {
        return this.adminService.creditTestFunds(email, currency, amount);
    }
    getPaymentStats() {
        return this.adminService.getPaymentStats();
    }
    getPaymentTransactions(page = '1', limit = '10', search, status, type, startDate, endDate) {
        return this.adminService.getPaymentTransactions(parseInt(page), parseInt(limit), {
            search,
            status,
            type,
            startDate,
            endDate,
        });
    }
    getPaymentTransactionDetail(transactionId) {
        return this.adminService.getPaymentTransactionDetail(transactionId);
    }
    getExchangeRates() {
        return this.exchangeRateService.getRateInfo();
    }
    async refreshExchangeRates() {
        const rates = await this.exchangeRateService.refreshRates();
        return {
            success: true,
            rates,
            lastUpdated: this.exchangeRateService.getLastUpdated(),
        };
    }
    getAuditLogs(page = '1', limit = '20', action, resource, userId, success, startDate, endDate, search) {
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
    getAuditStats() {
        return this.adminService.getAuditStats();
    }
    getUserAuditTrail(userId, page = '1', limit = '20') {
        return this.adminService.getUserAuditTrail(userId, parseInt(page), parseInt(limit));
    }
    getFeeConfigs() {
        return this.adminService.getFeeConfigs();
    }
    updateFeeConfig(key, value) {
        return this.adminService.updateFeeConfig(key, value);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of users with pagination' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, audit_decorator_1.AuditLog)('ADMIN_USER_STATUS_UPDATE', 'USER'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user account status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed user information' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserDetail", null);
__decorate([
    (0, common_1.Get)('wallets'),
    (0, swagger_1.ApiOperation)({ summary: 'List all user wallets' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllWallets", null);
__decorate([
    (0, common_1.Get)('wallets/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get wallet details with history' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getWalletDetail", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'List platform transactions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllTransactions", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'List all platform orders' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed order information' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOrderDetail", null);
__decorate([
    (0, common_1.Get)('blockchain/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get blockchain monitoring stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBlockchainStats", null);
__decorate([
    (0, common_1.Get)('blockchain/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Monitor blockchain transactions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBlockchainTransactions", null);
__decorate([
    (0, common_1.Get)('blockchain/failed'),
    (0, swagger_1.ApiOperation)({ summary: 'List failed transactions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFailedTransactions", null);
__decorate([
    (0, common_1.Post)('blockchain/failed/:id/retry'),
    (0, audit_decorator_1.AuditLog)('ADMIN_RETRY_WITHDRAWAL', 'TRANSACTION'),
    (0, swagger_1.ApiOperation)({ summary: 'Retry a failed withdrawal transaction' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "retryFailedTransaction", null);
__decorate([
    (0, common_1.Get)('crypto/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Hybrid webhook crypto system status (providers, registry, sweeps)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCryptoSystemStatus", null);
__decorate([
    (0, common_1.Get)('crypto/withdrawal-jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'List withdrawal confirmation jobs' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getWithdrawalJobs", null);
__decorate([
    (0, common_1.Get)('crypto/chain-balances'),
    (0, swagger_1.ApiOperation)({
        summary: 'Live on-chain balances of the platform master wallets',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getChainBalances", null);
__decorate([
    (0, common_1.Post)('crypto/reconcile'),
    (0, audit_decorator_1.AuditLog)('ADMIN_CRYPTO_RECONCILE', 'SYSTEM'),
    (0, swagger_1.ApiOperation)({ summary: 'Run full on-chain reconciliation (all chains)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reconcileAll", null);
__decorate([
    (0, common_1.Post)('crypto/reconcile/:currency'),
    (0, audit_decorator_1.AuditLog)('ADMIN_CRYPTO_RECONCILE_CURRENCY', 'SYSTEM'),
    (0, swagger_1.ApiOperation)({
        summary: 'Run on-chain reconciliation for a specific currency',
    }),
    __param(0, (0, common_1.Param)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reconcileCurrency", null);
__decorate([
    (0, common_1.Get)('fee-wallets'),
    (0, swagger_1.ApiOperation)({ summary: 'List platform fee wallets with ledger balances' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFeeWallets", null);
__decorate([
    (0, common_1.Post)('fee-wallets/init'),
    (0, audit_decorator_1.AuditLog)('ADMIN_FEE_WALLET_INIT', 'WALLET'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create/assign the platform fee wallets for all crypto currencies',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "initFeeWallets", null);
__decorate([
    (0, common_1.Post)('fee-wallets/:currency/sweep'),
    (0, audit_decorator_1.AuditLog)('ADMIN_FEE_SWEEP', 'WALLET'),
    (0, swagger_1.ApiOperation)({
        summary: 'Sweep platform fee wallet balance to a treasury address',
    }),
    __param(0, (0, common_1.Param)('currency')),
    __param(1, (0, common_1.Body)('address')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "sweepFeeWallet", null);
__decorate([
    (0, common_1.Post)('testnet/credit'),
    (0, audit_decorator_1.AuditLog)('ADMIN_TESTNET_CREDIT', 'WALLET'),
    (0, swagger_1.ApiOperation)({
        summary: 'Credit a user wallet with test funds (testnet environments only)',
    }),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('currency')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "creditTestFunds", null);
__decorate([
    (0, common_1.Get)('payments/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get NGN payment statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPaymentStats", null);
__decorate([
    (0, common_1.Get)('payments/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Monitor NGN payment transactions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('type')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPaymentTransactions", null);
__decorate([
    (0, common_1.Get)('payments/transactions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed payment transaction info' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPaymentTransactionDetail", null);
__decorate([
    (0, common_1.Get)('exchange-rates'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current exchange rates' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getExchangeRates", null);
__decorate([
    (0, common_1.Post)('exchange-rates/refresh'),
    (0, audit_decorator_1.AuditLog)('ADMIN_REFRESH_RATES', 'SYSTEM'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually refresh exchange rates from CoinGecko' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "refreshExchangeRates", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit logs with optional filters' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('action')),
    __param(3, (0, common_1.Query)('resource')),
    __param(4, (0, common_1.Query)('userId')),
    __param(5, (0, common_1.Query)('success')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __param(8, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('audit-logs/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit log statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditStats", null);
__decorate([
    (0, common_1.Get)('audit-logs/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit trail for a specific user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserAuditTrail", null);
__decorate([
    (0, common_1.Get)('fees'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all platform fee configurations' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFeeConfigs", null);
__decorate([
    (0, common_1.Patch)('fees/:key'),
    (0, audit_decorator_1.AuditLog)('ADMIN_FEE_UPDATE', 'PLATFORM_CONFIG'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a platform fee configuration' }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateFeeConfig", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        exchange_rate_service_1.ExchangeRateService,
        platform_service_1.PlatformService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map