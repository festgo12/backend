"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const core_module_1 = require("./core/core.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const admin_module_1 = require("./modules/admin/admin.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const marketplace_module_1 = require("./modules/marketplace/marketplace.module");
const orders_module_1 = require("./modules/orders/orders.module");
const tatum_module_1 = require("./modules/tatum/tatum.module");
const paystack_module_1 = require("./modules/paystack/paystack.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const audit_module_1 = require("./modules/audit/audit.module");
const disputes_module_1 = require("./modules/disputes/disputes.module");
const upload_module_1 = require("./modules/upload/upload.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            core_module_1.CoreModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            admin_module_1.AdminModule,
            wallet_module_1.WalletModule,
            marketplace_module_1.MarketplaceModule,
            orders_module_1.OrdersModule,
            tatum_module_1.TatumModule,
            paystack_module_1.PaystackModule,
            transactions_module_1.TransactionsModule,
            notifications_module_1.NotificationsModule,
            audit_module_1.AuditModule,
            disputes_module_1.DisputesModule,
            upload_module_1.UploadModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map