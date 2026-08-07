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
var ReportingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const reporting_service_1 = require("./reporting.service");
let ReportingScheduler = ReportingScheduler_1 = class ReportingScheduler {
    reportingService;
    logger = new common_1.Logger(ReportingScheduler_1.name);
    constructor(reportingService) {
        this.reportingService = reportingService;
    }
    async handleDailyReportGeneration() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        this.logger.log(`Generating daily report for ${yesterday.toISOString().split('T')[0]}`);
        try {
            await this.reportingService.generateDailyReport(yesterday);
            this.logger.log(`Daily report generated successfully for ${yesterday.toISOString().split('T')[0]}`);
        }
        catch (error) {
            this.logger.error(`Failed to generate daily report for ${yesterday.toISOString().split('T')[0]}`, error);
        }
    }
    async generateReportForDate(dateStr) {
        const date = new Date(dateStr);
        await this.reportingService.generateDailyReport(date);
    }
};
exports.ReportingScheduler = ReportingScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportingScheduler.prototype, "handleDailyReportGeneration", null);
exports.ReportingScheduler = ReportingScheduler = ReportingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reporting_service_1.ReportingService])
], ReportingScheduler);
//# sourceMappingURL=reporting.scheduler.js.map