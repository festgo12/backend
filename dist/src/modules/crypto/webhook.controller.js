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
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const crypto = __importStar(require("crypto"));
const crypto_config_service_1 = require("./crypto-config.service");
const webhook_processor_service_1 = require("./webhook-processor.service");
let WebhookController = WebhookController_1 = class WebhookController {
    config;
    processor;
    logger = new common_1.Logger(WebhookController_1.name);
    constructor(config, processor) {
        this.config = config;
        this.processor = processor;
    }
    async handleAlchemy(req, res) {
        const rawBody = req.rawBody;
        if (!rawBody) {
            this.logger.warn('Alchemy webhook received without raw body');
            res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
            return;
        }
        const signature = req.headers['x-alchemy-signature'];
        if (!this.verifyAlchemySignature(rawBody, signature)) {
            this.logger.warn('Alchemy webhook signature verification failed');
            res.status(common_1.HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
            return;
        }
        let payload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            this.logger.warn('Alchemy webhook: invalid JSON payload');
            res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
            return;
        }
        res.status(common_1.HttpStatus.OK).json({ received: true });
        try {
            await this.processor.processAlchemyEvent(payload);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Alchemy webhook processing failed: ${err.message}`);
        }
    }
    async handleQuickNode(req, res) {
        const rawBody = req.rawBody;
        if (!rawBody) {
            this.logger.warn('QuickNode webhook received without raw body');
            res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
            return;
        }
        const nonce = req.headers['x-qn-nonce'];
        const timestamp = req.headers['x-qn-timestamp'];
        const signature = req.headers['x-qn-signature'];
        if (!this.verifyQuickNodeSignature(rawBody, nonce, timestamp, signature)) {
            this.logger.warn('QuickNode webhook signature verification failed');
            res.status(common_1.HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
            return;
        }
        let payload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            this.logger.warn('QuickNode webhook: invalid JSON payload');
            res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
            return;
        }
        res.status(common_1.HttpStatus.OK).json({ received: true });
        try {
            await this.processor.processQuickNodeEvent(payload);
        }
        catch (error) {
            const err = error;
            this.logger.error(`QuickNode webhook processing failed: ${err.message}`);
        }
    }
    verifyAlchemySignature(rawBody, givenSignature) {
        const signingKey = this.config.alchemySigningKey;
        if (!signingKey) {
            this.logger.warn('ALCHEMY_SIGNING_KEY not configured; skipping Alchemy signature verification');
            return true;
        }
        if (!givenSignature)
            return false;
        const digest = crypto
            .createHmac('sha256', signingKey)
            .update(rawBody)
            .digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(givenSignature, 'utf8'), Buffer.from(digest, 'utf8'));
        }
        catch {
            return false;
        }
    }
    verifyQuickNodeSignature(rawBody, nonce, timestamp, givenSignature) {
        const secret = this.config.quicknodeStreamsSecret;
        if (!secret) {
            this.logger.warn('QN_STREAM_SECRET not configured; skipping QuickNode signature verification');
            return true;
        }
        if (!nonce || !timestamp || !givenSignature)
            return false;
        const bodyString = rawBody.toString('utf8');
        const signatureData = nonce + timestamp + bodyString;
        const hmac = crypto
            .createHmac('sha256', Buffer.from(secret))
            .update(Buffer.from(signatureData))
            .digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(givenSignature, 'hex'));
        }
        catch {
            return false;
        }
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)('alchemy'),
    (0, swagger_1.ApiOperation)({ summary: 'Alchemy Address Activity Webhook receiver' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleAlchemy", null);
__decorate([
    (0, common_1.Post)('quicknode'),
    (0, swagger_1.ApiOperation)({ summary: 'QuickNode Streams Webhook receiver (BTC)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleQuickNode", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Crypto Webhooks'),
    (0, common_1.Controller)('api/v1/webhooks'),
    __metadata("design:paramtypes", [crypto_config_service_1.CryptoConfigService,
        webhook_processor_service_1.WebhookProcessorService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map