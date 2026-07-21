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
exports.ReportingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("../../generated/client/index.js");
const reporting_service_1 = require("./reporting.service");
const reporting_scheduler_1 = require("./reporting.scheduler");
const VALID_CATEGORIES = [
    'revenue',
    'trading-volume',
    'deposits',
    'withdrawals',
    'gift-cards',
    'user-growth',
    'disputes',
    'fraud',
];
let ReportingController = class ReportingController {
    reportingService;
    reportingScheduler;
    constructor(reportingService, reportingScheduler) {
        this.reportingService = reportingService;
        this.reportingScheduler = reportingScheduler;
    }
    getOverview(startDate, endDate) {
        return this.reportingService.getOverview(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getLiveStats() {
        return this.reportingService.getLiveStats();
    }
    getRevenue(startDate, endDate) {
        return this.reportingService.getReportByCategory('revenue', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getTradingVolume(startDate, endDate) {
        return this.reportingService.getReportByCategory('trading-volume', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getDeposits(startDate, endDate) {
        return this.reportingService.getReportByCategory('deposits', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getWithdrawals(startDate, endDate) {
        return this.reportingService.getReportByCategory('withdrawals', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getGiftCards(startDate, endDate) {
        return this.reportingService.getReportByCategory('gift-cards', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getUserGrowth(startDate, endDate) {
        return this.reportingService.getReportByCategory('user-growth', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getDisputes(startDate, endDate) {
        return this.reportingService.getReportByCategory('disputes', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    getFraud(startDate, endDate) {
        return this.reportingService.getReportByCategory('fraud', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
    }
    async exportCsv(category, startDate, endDate) {
        if (!VALID_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        const { headers, rows } = await this.reportingService.getExportData(category, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        return { filename: `${category}-report.csv`, contentType: 'text/csv', content: csvContent };
    }
    async exportPdf(category, startDate, endDate) {
        if (!VALID_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        const { headers, rows } = await this.reportingService.getExportData(category, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
        const summary = await this.reportingService.getReportByCategory(category, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate || new Date().toISOString());
        return {
            title: `${category.replace(/-/g, ' ').toUpperCase()} REPORT`,
            dateRange: { startDate, endDate },
            headers,
            rows,
            summary: summary.summary,
        };
    }
    async generateForDate(date) {
        await this.reportingScheduler.generateReportForDate(date);
        return { success: true, message: `Report generated for ${date}` };
    }
};
exports.ReportingController = ReportingController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, swagger_1.ApiOperation)({ summary: 'Get report overview with all categories' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('live'),
    (0, swagger_1.ApiOperation)({ summary: 'Get real-time stats for current day' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getLiveStats", null);
__decorate([
    (0, common_1.Get)('revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('trading-volume'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trading volume report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getTradingVolume", null);
__decorate([
    (0, common_1.Get)('deposits'),
    (0, swagger_1.ApiOperation)({ summary: 'Get deposits report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getDeposits", null);
__decorate([
    (0, common_1.Get)('withdrawals'),
    (0, swagger_1.ApiOperation)({ summary: 'Get withdrawals report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getWithdrawals", null);
__decorate([
    (0, common_1.Get)('gift-cards'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift cards report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getGiftCards", null);
__decorate([
    (0, common_1.Get)('user-growth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user growth report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getUserGrowth", null);
__decorate([
    (0, common_1.Get)('disputes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get disputes report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getDisputes", null);
__decorate([
    (0, common_1.Get)('fraud'),
    (0, swagger_1.ApiOperation)({ summary: 'Get fraud events report' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportingController.prototype, "getFraud", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    (0, swagger_1.ApiOperation)({ summary: 'Export report data as CSV' }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)('export/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Export report data as PDF-ready JSON' }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "exportPdf", null);
__decorate([
    (0, common_1.Post)('generate/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually generate report for a specific date (backfill)' }),
    __param(0, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportingController.prototype, "generateForDate", null);
exports.ReportingController = ReportingController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Controller)('admin/reports'),
    __metadata("design:paramtypes", [reporting_service_1.ReportingService,
        reporting_scheduler_1.ReportingScheduler])
], ReportingController);
//# sourceMappingURL=reporting.controller.js.map