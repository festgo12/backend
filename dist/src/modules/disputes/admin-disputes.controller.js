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
exports.AdminDisputesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("../../generated/client/index.js");
const audit_decorator_1 = require("../audit/audit.decorator");
const disputes_service_1 = require("./disputes.service");
const update_dispute_status_dto_1 = require("./dto/update-dispute-status.dto");
const resolve_dispute_dto_1 = require("./dto/resolve-dispute.dto");
const assign_dispute_dto_1 = require("./dto/assign-dispute.dto");
let AdminDisputesController = class AdminDisputesController {
    disputesService;
    constructor(disputesService) {
        this.disputesService = disputesService;
    }
    findAll(page = '1', limit = '20', status, assigneeId, startDate, endDate, search) {
        return this.disputesService.listAllDisputes({ status, assigneeId, startDate, endDate, search }, parseInt(page), parseInt(limit));
    }
    getStats() {
        return this.disputesService.getDisputeStats();
    }
    findOne(id) {
        return this.disputesService.getDisputeAdmin(id);
    }
    updateStatus(id, req, dto) {
        return this.disputesService.updateDisputeStatus(id, dto.status, req.user.id, dto.reason);
    }
    assign(id, dto) {
        return this.disputesService.assignDispute(id, dto.assigneeId);
    }
    resolve(id, req, dto) {
        return this.disputesService.resolveDispute(id, dto.resolution, dto.outcome || client_1.DisputeStatus.RESOLVED, req.user.id);
    }
    freezeOrder(id, req) {
        return this.disputesService.freezeOrder(id, req.user.id);
    }
};
exports.AdminDisputesController = AdminDisputesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all disputes with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.DisputeStatus }),
    (0, swagger_1.ApiQuery)({ name: 'assigneeId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('assigneeId')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dispute statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed dispute information' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, audit_decorator_1.AuditLog)('DISPUTE_STATUS_CHANGED', 'DISPUTE'),
    (0, swagger_1.ApiOperation)({ summary: 'Update dispute status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_dispute_status_dto_1.UpdateDisputeStatusDto]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/assign'),
    (0, audit_decorator_1.AuditLog)('DISPUTE_ASSIGNED', 'DISPUTE'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign dispute to an admin' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_dispute_dto_1.AssignDisputeDto]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "assign", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    (0, audit_decorator_1.AuditLog)('DISPUTE_RESOLVED', 'DISPUTE'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve or reject a dispute' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, resolve_dispute_dto_1.ResolveDisputeDto]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id/freeze-order'),
    (0, audit_decorator_1.AuditLog)('ORDER_FROZEN', 'ORDER'),
    (0, swagger_1.ApiOperation)({ summary: 'Freeze the associated order' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminDisputesController.prototype, "freezeOrder", null);
exports.AdminDisputesController = AdminDisputesController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Disputes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Controller)('admin/disputes'),
    __metadata("design:paramtypes", [disputes_service_1.DisputesService])
], AdminDisputesController);
//# sourceMappingURL=admin-disputes.controller.js.map