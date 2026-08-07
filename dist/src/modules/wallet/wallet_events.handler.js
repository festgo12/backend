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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletEventsHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const wallet_service_1 = require("./wallet.service");
const client_1 = require("../../generated/client/index.js");
let WalletEventsHandler = class WalletEventsHandler {
    walletService;
    constructor(walletService) {
        this.walletService = walletService;
    }
    async handleUserCreated(payload) {
        await this.walletService.getOrCreateWallet(payload.userId, client_1.Currency.NGN);
    }
};
exports.WalletEventsHandler = WalletEventsHandler;
__decorate([
    (0, event_emitter_1.OnEvent)('user.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletEventsHandler.prototype, "handleUserCreated", null);
exports.WalletEventsHandler = WalletEventsHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletEventsHandler);
//# sourceMappingURL=wallet_events.handler.js.map