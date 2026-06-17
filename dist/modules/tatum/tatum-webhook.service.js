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
var TatumWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto = __importStar(require("crypto"));
let TatumWebhookService = TatumWebhookService_1 = class TatumWebhookService {
    configService;
    prisma;
    logger = new common_1.Logger(TatumWebhookService_1.name);
    hmacSecret;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.hmacSecret = this.configService.get('TATUM_WEBHOOK_SECRET') || '';
    }
    verifySignature(payload, signature) {
        if (!this.hmacSecret || !signature) {
            if (this.configService.get('NODE_ENV') !== 'production')
                return true;
            return false;
        }
        const hmac = crypto.createHmac('sha256', this.hmacSecret);
        const body = JSON.stringify(payload);
        const digest = hmac.update(body).digest('hex');
        return digest === signature;
    }
    async markTransactionAsCompleted(txId) {
        try {
            await this.prisma.walletTransaction.update({
                where: { reference: txId },
                data: { status: 'COMPLETED' },
            });
            this.logger.log(`Transaction ${txId} marked as COMPLETED.`);
        }
        catch (error) {
            this.logger.error(`Failed to mark transaction ${txId} as completed: ${error.message}`);
        }
    }
};
exports.TatumWebhookService = TatumWebhookService;
exports.TatumWebhookService = TatumWebhookService = TatumWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], TatumWebhookService);
//# sourceMappingURL=tatum-webhook.service.js.map