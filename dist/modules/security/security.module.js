"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const security_service_1 = require("./security.service");
const security_controller_1 = require("./security.controller");
const admin_security_controller_1 = require("./admin-security.controller");
const fraud_rules_service_1 = require("./fraud-rules.service");
const risk_engine_service_1 = require("./risk-engine.service");
const alert_engine_service_1 = require("./alert-engine.service");
const notifications_module_1 = require("../notifications/notifications.module");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [security_controller_1.SecurityController, admin_security_controller_1.AdminSecurityController],
        providers: [
            security_service_1.SecurityService,
            fraud_rules_service_1.FraudRulesService,
            risk_engine_service_1.RiskEngineService,
            alert_engine_service_1.AlertEngineService,
        ],
        exports: [security_service_1.SecurityService, fraud_rules_service_1.FraudRulesService, risk_engine_service_1.RiskEngineService, alert_engine_service_1.AlertEngineService],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map