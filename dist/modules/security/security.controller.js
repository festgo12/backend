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
exports.SecurityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const security_service_1 = require("./security.service");
const fraud_rules_service_1 = require("./fraud-rules.service");
const risk_engine_service_1 = require("./risk-engine.service");
const alert_engine_service_1 = require("./alert-engine.service");
const query_alerts_dto_1 = require("./dto/query-alerts.dto");
const audit_decorator_1 = require("../audit/audit.decorator");
let SecurityController = class SecurityController {
    securityService;
    fraudRulesService;
    riskEngineService;
    alertEngineService;
    constructor(securityService, fraudRulesService, riskEngineService, alertEngineService) {
        this.securityService = securityService;
        this.fraudRulesService = fraudRulesService;
        this.riskEngineService = riskEngineService;
        this.alertEngineService = alertEngineService;
    }
    getDevices(req) {
        return this.securityService.getUserDevices(req.user.id);
    }
    removeDevice(req, deviceId) {
        return this.securityService.removeDevice(req.user.id, deviceId);
    }
    removeAllDevices(req) {
        return this.securityService.removeAllDevices(req.user.id);
    }
    getSessions(req) {
        return this.securityService.getUserSessions(req.user.id);
    }
    revokeSession(req, tokenId) {
        return this.securityService.revokeSession(req.user.id, tokenId);
    }
    revokeAllSessions(req) {
        return this.securityService.revokeAllSessions(req.user.id);
    }
    getAlerts(req, query) {
        return this.securityService.getUserAlerts(req.user.id, query);
    }
    markAlertRead(req, alertId) {
        return this.securityService.markAlertAsRead(req.user.id, alertId);
    }
    markAllAlertsRead(req) {
        return this.securityService.markAllAlertsAsRead(req.user.id);
    }
    getUnreadCount(req) {
        return this.securityService.getUnreadAlertCount(req.user.id);
    }
    getAlertStats(req) {
        return this.alertEngineService.getAlertStats(req.user.id);
    }
    getSecurityScore(req) {
        return this.securityService.getSecurityScore(req.user.id);
    }
    getRiskScore(req) {
        return this.riskEngineService.calculateUserRiskScore(req.user.id);
    }
};
exports.SecurityController = SecurityController;
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({ summary: 'List all devices for the current user' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getDevices", null);
__decorate([
    (0, common_1.Delete)('devices/:id'),
    (0, audit_decorator_1.AuditLog)('SECURITY_DEVICE_REMOVE', 'DEVICE'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a device' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "removeDevice", null);
__decorate([
    (0, common_1.Delete)('devices'),
    (0, audit_decorator_1.AuditLog)('SECURITY_DEVICES_REMOVE_ALL', 'DEVICE'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove all other devices (keep current)' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "removeAllDevices", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'List all active sessions' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    (0, audit_decorator_1.AuditLog)('SECURITY_SESSION_REVOKE', 'SESSION'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a session' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.Delete)('sessions'),
    (0, audit_decorator_1.AuditLog)('SECURITY_SESSIONS_REVOKE_ALL', 'SESSION'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke all other sessions' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "revokeAllSessions", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'List security alerts' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_alerts_dto_1.QueryAlertsDto]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Patch)('alerts/:id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark an alert as read' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "markAlertRead", null);
__decorate([
    (0, common_1.Patch)('alerts/read-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all alerts as read' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "markAllAlertsRead", null);
__decorate([
    (0, common_1.Get)('alerts/unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread alert count' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('alerts/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get alert statistics' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getAlertStats", null);
__decorate([
    (0, common_1.Get)('score'),
    (0, swagger_1.ApiOperation)({ summary: 'Get security score for current user' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getSecurityScore", null);
__decorate([
    (0, common_1.Get)('risk'),
    (0, swagger_1.ApiOperation)({ summary: 'Get personal risk assessment' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "getRiskScore", null);
exports.SecurityController = SecurityController = __decorate([
    (0, swagger_1.ApiTags)('Security'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('security'),
    __metadata("design:paramtypes", [security_service_1.SecurityService,
        fraud_rules_service_1.FraudRulesService,
        risk_engine_service_1.RiskEngineService,
        alert_engine_service_1.AlertEngineService])
], SecurityController);
//# sourceMappingURL=security.controller.js.map