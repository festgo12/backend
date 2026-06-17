"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
const tatum_deposit_service_1 = require("./tatum-deposit.service");
const tatum_withdrawal_service_1 = require("./tatum-withdrawal.service");
const tatum_risk_service_1 = require("./tatum-risk.service");
const tatum_webhook_service_1 = require("./tatum-webhook.service");
const tatum_webhook_controller_1 = require("./tatum-webhook.controller");
const wallet_module_1 = require("../wallet/wallet.module");
let TatumModule = class TatumModule {
};
exports.TatumModule = TatumModule;
exports.TatumModule = TatumModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, wallet_module_1.WalletModule],
        controllers: [tatum_webhook_controller_1.TatumWebhookController],
        providers: [
            tatum_wallet_service_1.TatumWalletService,
            tatum_deposit_service_1.TatumDepositService,
            tatum_withdrawal_service_1.TatumWithdrawalService,
            tatum_risk_service_1.TatumRiskService,
            tatum_webhook_service_1.TatumWebhookService,
        ],
        exports: [
            tatum_wallet_service_1.TatumWalletService,
            tatum_deposit_service_1.TatumDepositService,
            tatum_withdrawal_service_1.TatumWithdrawalService,
            tatum_risk_service_1.TatumRiskService,
            tatum_webhook_service_1.TatumWebhookService,
        ],
    })
], TatumModule);
//# sourceMappingURL=tatum.module.js.map