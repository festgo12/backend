"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardStoreModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const gift_card_store_service_1 = require("./gift-card-store.service");
const gift_card_store_controller_1 = require("./gift-card-store.controller");
const admin_gift_card_store_controller_1 = require("./admin-gift-card-store.controller");
const gift_card_store_events_handler_1 = require("./gift-card-store.events.handler");
const giftbit_client_1 = require("./giftbit.client");
const wallet_module_1 = require("../wallet/wallet.module");
const notifications_module_1 = require("../notifications/notifications.module");
let GiftCardStoreModule = class GiftCardStoreModule {
};
exports.GiftCardStoreModule = GiftCardStoreModule;
exports.GiftCardStoreModule = GiftCardStoreModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            (0, common_1.forwardRef)(() => notifications_module_1.NotificationsModule),
        ],
        controllers: [gift_card_store_controller_1.GiftCardStoreController, admin_gift_card_store_controller_1.AdminGiftCardStoreController],
        providers: [gift_card_store_service_1.GiftCardStoreService, giftbit_client_1.GiftbitClient, gift_card_store_events_handler_1.GiftCardStoreEventsHandler],
        exports: [gift_card_store_service_1.GiftCardStoreService],
    })
], GiftCardStoreModule);
//# sourceMappingURL=gift-card-store.module.js.map