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
exports.AdminSecurityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("../../generated/client/index.js");
const fraud_rules_service_1 = require("./fraud-rules.service");
const risk_engine_service_1 = require("./risk-engine.service");
const alert_engine_service_1 = require("./alert-engine.service");
const prisma_service_1 = require("../../core/database/prisma.service");
const update_fraud_rule_dto_1 = require("./dto/update-fraud-rule.dto");
let AdminSecurityController = class AdminSecurityController {
    fraudRulesService;
    riskEngineService;
    alertEngineService;
    prisma;
    constructor(fraudRulesService, riskEngineService, alertEngineService, prisma) {
        this.fraudRulesService = fraudRulesService;
        this.riskEngineService = riskEngineService;
        this.alertEngineService = alertEngineService;
        this.prisma = prisma;
    }
    getFraudRules() {
        return this.fraudRulesService.getAllRules();
    }
    updateFraudRule(ruleId, dto) {
        return this.fraudRulesService.updateRule(ruleId, dto);
    }
    getRiskOverview() {
        return this.riskEngineService.getAdminRiskOverview();
    }
    async getAllAlerts(page = '1', limit = '20', severity, type, userId) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (severity)
            where.severity = severity;
        if (type)
            where.type = type;
        if (userId)
            where.userId = userId;
        const [alerts, total] = await Promise.all([
            this.prisma.securityAlert.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            this.prisma.securityAlert.count({ where }),
        ]);
        return {
            alerts,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }
    async getAlertStats() {
        const [total, unread, bySeverity, byType] = await Promise.all([
            this.prisma.securityAlert.count(),
            this.prisma.securityAlert.count({ where: { isRead: false } }),
            this.prisma.securityAlert.groupBy({
                by: ['severity'],
                _count: { severity: true },
            }),
            this.prisma.securityAlert.groupBy({
                by: ['type'],
                _count: { type: true },
                orderBy: { _count: { type: 'desc' } },
                take: 10,
            }),
        ]);
        return {
            total,
            unread,
            bySeverity: bySeverity.map((s) => ({
                severity: s.severity,
                count: s._count.severity,
            })),
            topTypes: byType.map((t) => ({
                type: t.type,
                count: t._count.type,
            })),
        };
    }
    async markAlertAsRead(alertId) {
        return this.prisma.securityAlert.update({
            where: { id: alertId },
            data: { isRead: true },
        });
    }
};
exports.AdminSecurityController = AdminSecurityController;
__decorate([
    (0, common_1.Get)('fraud-rules'),
    (0, swagger_1.ApiOperation)({ summary: 'List all fraud rules' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSecurityController.prototype, "getFraudRules", null);
__decorate([
    (0, common_1.Patch)('fraud-rules/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a fraud rule' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_fraud_rule_dto_1.UpdateFraudRuleDto]),
    __metadata("design:returntype", void 0)
], AdminSecurityController.prototype, "updateFraudRule", null);
__decorate([
    (0, common_1.Get)('risk-overview'),
    (0, swagger_1.ApiOperation)({ summary: 'Get risk analytics overview for admin dashboard' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSecurityController.prototype, "getRiskOverview", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'List all security alerts across all users (admin)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('severity')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "getAllAlerts", null);
__decorate([
    (0, common_1.Get)('alerts/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get alert statistics across all users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "getAlertStats", null);
__decorate([
    (0, common_1.Patch)('alerts/:id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark an alert as read' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "markAlertAsRead", null);
exports.AdminSecurityController = AdminSecurityController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Security'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Controller)('admin/security'),
    __metadata("design:paramtypes", [fraud_rules_service_1.FraudRulesService,
        risk_engine_service_1.RiskEngineService,
        alert_engine_service_1.AlertEngineService,
        prisma_service_1.PrismaService])
], AdminSecurityController);
//# sourceMappingURL=admin-security.controller.js.map