"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GiftCardStoreWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftCardStoreWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const gift_card_store_service_1 = require("./gift-card-store.service");
const crypto = __importStar(require("crypto"));
let GiftCardStoreWebhookController = GiftCardStoreWebhookController_1 = class GiftCardStoreWebhookController {
    storeService;
    configService;
    logger = new common_1.Logger(GiftCardStoreWebhookController_1.name);
    constructor(storeService, configService) {
        this.storeService = storeService;
        this.configService = configService;
    }
    async handleWebhook(authorization, payload) {
        this.verifySignature(authorization);
        const result = await this.storeService.resolveOrder(payload);
        this.logger.log(`Reloadly webhook processed: matched=${result.matched}, order=${result.orderId}`);
        return { received: true, ...result };
    }
    verifySignature(authorization) {
        const secret = this.configService.get('RELOADLY_WEBHOOK_SECRET') || '';
        if (!secret) {
            this.logger.warn('RELOADLY_WEBHOOK_SECRET not configured; rejecting webhook (fail-closed)');
            throw new common_1.UnauthorizedException('Webhook secret not configured');
        }
        const provided = authorization?.replace(/^Bearer\s+/i, '').trim() || '';
        if (!provided) {
            throw new common_1.UnauthorizedException('Missing webhook authorization');
        }
        const expected = Buffer.from(secret, 'utf8');
        const actual = Buffer.from(provided, 'utf8');
        const safe = expected.length === actual.length &&
            crypto.timingSafeEqual(expected, actual);
        if (!safe) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
    }
};
exports.GiftCardStoreWebhookController = GiftCardStoreWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reloadly order event webhook' }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GiftCardStoreWebhookController.prototype, "handleWebhook", null);
exports.GiftCardStoreWebhookController = GiftCardStoreWebhookController = GiftCardStoreWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Gift Card Store Webhook'),
    (0, common_1.Controller)('gift-card-store/webhook'),
    __metadata("design:paramtypes", [gift_card_store_service_1.GiftCardStoreService,
        config_1.ConfigService])
], GiftCardStoreWebhookController);
//# sourceMappingURL=gift-card-store.webhook.controller.js.map