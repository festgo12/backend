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
var AuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const audit_service_1 = require("./audit.service");
const audit_decorator_1 = require("./audit.decorator");
let AuditInterceptor = AuditInterceptor_1 = class AuditInterceptor {
    reflector;
    auditService;
    logger = new common_1.Logger(AuditInterceptor_1.name);
    constructor(reflector, auditService) {
        this.reflector = reflector;
        this.auditService = auditService;
    }
    intercept(context, next) {
        const auditMeta = this.reflector.get(audit_decorator_1.AUDIT_KEY, context.getHandler());
        if (!auditMeta) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const ip = this.extractIp(request);
        const device = request.headers['user-agent'] || 'unknown';
        const startTime = Date.now();
        return next.handle().pipe((0, operators_1.tap)((response) => {
            this.writeLog(auditMeta, {
                userId: user?.id,
                actorId: user?.id,
                ip,
                device,
                newValue: response,
                success: true,
                startTime,
            });
        }), (0, operators_1.catchError)((error) => {
            const isAuthFailure = auditMeta.action.includes('LOGIN') ||
                auditMeta.action.includes('AUTH');
            this.writeLog(auditMeta, {
                userId: user?.id,
                actorId: user?.id,
                ip,
                device,
                success: false,
                errorMessage: error.message,
                metadata: isAuthFailure ? { statusCode: error.status || 500 } : undefined,
                startTime,
            });
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
    extractIp(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return request.ip || request.socket?.remoteAddress || 'unknown';
    }
    writeLog(auditMeta, data) {
        const resourceId = data.newValue?.id || data.newValue?.orderId || undefined;
        this.auditService.log({
            userId: data.actorId || data.userId || 'system',
            actorId: data.actorId,
            action: auditMeta.action,
            resource: auditMeta.resource,
            resourceId,
            newValue: data.newValue
                ? this.sanitizeResponse(data.newValue)
                : undefined,
            metadata: {
                ...data.metadata,
                duration: `${Date.now() - data.startTime}ms`,
            },
            ipAddress: data.ip,
            device: data.device,
            success: data.success,
            errorMessage: data.errorMessage,
        });
    }
    sanitizeResponse(data) {
        if (!data || typeof data !== 'object')
            return data;
        const sensitiveKeys = ['passwordHash', 'password', 'twoFactorSecret', 'resetToken', 'fcmToken'];
        const sanitized = { ...data };
        for (const key of sensitiveKeys) {
            if (key in sanitized) {
                sanitized[key] = '[REDACTED]';
            }
        }
        return sanitized;
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = AuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map