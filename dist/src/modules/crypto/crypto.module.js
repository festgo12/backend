"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const crypto_config_service_1 = require("./crypto-config.service");
const hd_wallet_service_1 = require("./hd-wallet.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const chain_client_service_1 = require("./chain-client.service");
const evm_deposit_processor_service_1 = require("./evm-deposit-processor.service");
const btc_websocket_service_1 = require("./btc-websocket.service");
const withdrawal_tracker_service_1 = require("./withdrawal-tracker.service");
const crypto_withdrawal_service_1 = require("./crypto-withdrawal.service");
const sweep_service_1 = require("./sweep.service");
const platform_service_1 = require("./platform.service");
const exchange_rate_service_1 = require("./exchange-rate.service");
const webhook_controller_1 = require("./webhook.controller");
const webhook_processor_service_1 = require("./webhook-processor.service");
const address_registration_service_1 = require("./address-registration.service");
const reconciliation_service_1 = require("./reconciliation.service");
const wallet_module_1 = require("../wallet/wallet.module");
let CryptoModule = class CryptoModule {
};
exports.CryptoModule = CryptoModule;
exports.CryptoModule = CryptoModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, wallet_module_1.WalletModule],
        controllers: [webhook_controller_1.WebhookController],
        providers: [
            crypto_config_service_1.CryptoConfigService,
            hd_wallet_service_1.HdWalletService,
            deposit_address_registry_service_1.DepositAddressRegistry,
            chain_client_service_1.ChainClientService,
            evm_deposit_processor_service_1.EvmDepositProcessorService,
            btc_websocket_service_1.BtcAlchemyWebSocketService,
            withdrawal_tracker_service_1.WithdrawalTrackerService,
            crypto_withdrawal_service_1.CryptoWithdrawalService,
            sweep_service_1.SweepService,
            platform_service_1.PlatformService,
            exchange_rate_service_1.ExchangeRateService,
            webhook_processor_service_1.WebhookProcessorService,
            address_registration_service_1.AddressRegistrationService,
            reconciliation_service_1.ReconciliationService,
        ],
        exports: [
            crypto_config_service_1.CryptoConfigService,
            hd_wallet_service_1.HdWalletService,
            deposit_address_registry_service_1.DepositAddressRegistry,
            chain_client_service_1.ChainClientService,
            evm_deposit_processor_service_1.EvmDepositProcessorService,
            btc_websocket_service_1.BtcAlchemyWebSocketService,
            withdrawal_tracker_service_1.WithdrawalTrackerService,
            crypto_withdrawal_service_1.CryptoWithdrawalService,
            sweep_service_1.SweepService,
            platform_service_1.PlatformService,
            exchange_rate_service_1.ExchangeRateService,
            webhook_processor_service_1.WebhookProcessorService,
            address_registration_service_1.AddressRegistrationService,
            reconciliation_service_1.ReconciliationService,
        ],
    })
], CryptoModule);
//# sourceMappingURL=crypto.module.js.map