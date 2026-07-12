"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = exports.AUDIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.AUDIT_KEY = 'audit_metadata';
const AuditLog = (action, resource) => (0, common_1.SetMetadata)(exports.AUDIT_KEY, { action, resource });
exports.AuditLog = AuditLog;
//# sourceMappingURL=audit.decorator.js.map