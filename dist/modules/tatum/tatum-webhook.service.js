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
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
const crypto = __importStar(require("crypto"));
let TatumWebhookService = TatumWebhookService_1 = class TatumWebhookService {
    configService;
    httpService;
    prisma;
    walletService;
    tatumWallet;
    logger = new common_1.Logger(TatumWebhookService_1.name);
    hmacSecret;
    apiKey;
    baseUrl = 'https://api.tatum.io/v4';
    subscriptions = new Map();
    constructor(configService, httpService, prisma, walletService, tatumWallet) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
        this.hmacSecret = this.configService.get('TATUM_WEBHOOK_SECRET') || '';
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    async onApplicationBootstrap() {
        try {
            await this.ensureOutgoingWebhooks();
        }
        catch (error) {
            this.logger.warn(`Failed to register outgoing webhooks on startup: ${error.message}`);
        }
    }
    get headers() {
        return { 'x-api-key': this.apiKey };
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
            const transaction = await this.prisma.walletTransaction.findUnique({
                where: { reference: txId },
            });
            if (!transaction) {
                this.logger.warn(`Transaction with reference ${txId} not found.`);
                return;
            }
            await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED');
            this.logger.log(`Transaction ${txId} marked as COMPLETED and balance synced.`);
        }
        catch (error) {
            this.logger.error(`Failed to mark transaction ${txId} as completed: ${error.message}`);
        }
    }
    getWebhookUrl() {
        const configured = this.configService.get('TATUM_WEBHOOK_URL');
        if (configured)
            return configured;
        const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
        return `${appUrl}/tatum/webhooks/incoming`;
    }
    async registerAddressSubscription(address, chain, currency) {
        const webhookUrl = this.getWebhookUrl();
        const subKey = `${chain}:${address}`;
        if (this.subscriptions.has(subKey)) {
            this.logger.debug(`Webhook subscription already exists for ${address}`);
            return this.subscriptions.get(subKey);
        }
        try {
            this.logger.log(`Registering Tatum webhook for ${currency} address ${address}`);
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/subscription`, {
                type: 'ADDRESS_EVENT',
                attr: {
                    address,
                    chain,
                    url: webhookUrl,
                },
            }, { headers: this.headers }));
            const subscription = {
                id: response.data?.id || `sub-${Date.now()}`,
                address,
                chain,
                currency,
                type: 'ADDRESS_EVENT',
                createdAt: new Date(),
            };
            this.subscriptions.set(subKey, subscription);
            this.logger.log(`Tatum webhook registered: ${subscription.id} for ${address}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to register Tatum webhook for ${address}: ${error.response?.data?.message || error.message}`);
            return null;
        }
    }
    async registerOutgoingSubscription(chain) {
        const webhookUrl = this.getWebhookUrl();
        const subKey = `outgoing:${chain}`;
        if (this.subscriptions.has(subKey)) {
            return this.subscriptions.get(subKey);
        }
        try {
            this.logger.log(`Registering outgoing transaction webhook for ${chain}`);
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/subscription`, {
                type: 'OUTGOING_NATIVE_TX',
                attr: {
                    chain,
                    url: webhookUrl,
                },
            }, { headers: this.headers }));
            const subscription = {
                id: response.data?.id || `sub-out-${Date.now()}`,
                address: '*',
                chain,
                currency: chain,
                type: 'OUTGOING_NATIVE_TX',
                createdAt: new Date(),
            };
            this.subscriptions.set(subKey, subscription);
            this.logger.log(`Outgoing webhook registered: ${subscription.id} for ${chain}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to register outgoing webhook for ${chain}: ${error.response?.data?.message || error.message}`);
            return null;
        }
    }
    async cancelSubscription(subscriptionId) {
        try {
            await (0, rxjs_1.lastValueFrom)(this.httpService.delete(`${this.baseUrl}/subscription/${subscriptionId}`, {
                headers: this.headers,
            }));
            for (const [key, sub] of this.subscriptions.entries()) {
                if (sub.id === subscriptionId) {
                    this.subscriptions.delete(key);
                    break;
                }
            }
            this.logger.log(`Webhook subscription cancelled: ${subscriptionId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to cancel subscription ${subscriptionId}: ${error.message}`);
            return false;
        }
    }
    getActiveSubscriptions() {
        return Array.from(this.subscriptions.values());
    }
    getSubscriptionSummary() {
        const subs = this.getActiveSubscriptions();
        const byChain = {};
        const byType = {};
        for (const sub of subs) {
            byChain[sub.chain] = (byChain[sub.chain] || 0) + 1;
            byType[sub.type] = (byType[sub.type] || 0) + 1;
        }
        return {
            total: subs.length,
            byChain,
            byType,
            subscriptions: subs,
        };
    }
    async ensureOutgoingWebhooks() {
        const chains = ['BTC', 'ETH'];
        for (const chain of chains) {
            await this.registerOutgoingSubscription(chain);
        }
    }
    static notificationChain(currency) {
        switch (currency.toUpperCase()) {
            case 'BTC':
                return 'BTC';
            case 'ETH':
            case 'USDT':
            case 'USDC':
                return 'ETH';
            default:
                return currency.toUpperCase();
        }
    }
};
exports.TatumWebhookService = TatumWebhookService;
exports.TatumWebhookService = TatumWebhookService = TatumWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        tatum_wallet_service_1.TatumWalletService])
], TatumWebhookService);
//# sourceMappingURL=tatum-webhook.service.js.map