"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardModule = void 0;
const common_1 = require("@nestjs/common");
const gift_card_service_1 = require("./gift-card.service");
const gift_card_controller_1 = require("./gift-card.controller");
const admin_gift_card_controller_1 = require("./admin-gift-card.controller");
const gift_card_events_handler_1 = require("./gift-card.events.handler");
const wallet_module_1 = require("../wallet/wallet.module");
const upload_module_1 = require("../upload/upload.module");
const notifications_module_1 = require("../notifications/notifications.module");
const encryption_1 = require("../../core/utils/encryption");
let GiftCardModule = class GiftCardModule {
};
exports.GiftCardModule = GiftCardModule;
exports.GiftCardModule = GiftCardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            (0, common_1.forwardRef)(() => upload_module_1.UploadModule),
            (0, common_1.forwardRef)(() => notifications_module_1.NotificationsModule),
        ],
        controllers: [gift_card_controller_1.GiftCardController, admin_gift_card_controller_1.AdminGiftCardController],
        providers: [gift_card_service_1.GiftCardService, gift_card_events_handler_1.GiftCardEventsHandler, encryption_1.EncryptionService],
        exports: [gift_card_service_1.GiftCardService],
    })
], GiftCardModule);
//# sourceMappingURL=gift-card.module.js.map