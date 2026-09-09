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
var ReloadlyClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReloadlyClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let ReloadlyClient = ReloadlyClient_1 = class ReloadlyClient {
    configService;
    httpService;
    logger = new common_1.Logger(ReloadlyClient_1.name);
    clientId;
    clientSecret;
    sandbox;
    authBaseUrl = 'https://auth.reloadly.com';
    apiBaseUrl;
    accessToken = null;
    tokenExpiresAt = 0;
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.clientId = this.configService.get('RELOADLY_CLIENT_ID') || '';
        this.clientSecret =
            this.configService.get('RELOADLY_CLIENT_SECRET') || '';
        this.sandbox =
            this.configService.get('RELOADLY_SANDBOX') !== 'false';
        this.apiBaseUrl = this.sandbox
            ? 'https://giftcards-sandbox.reloadly.com'
            : 'https://giftcards.reloadly.com';
    }
    isConfigured() {
        return Boolean(this.clientId && this.clientSecret);
    }
    get audience() {
        return this.sandbox
            ? 'giftcards-sandbox.reloadly.com'
            : 'giftcards.reloadly.com';
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && this.tokenExpiresAt > now + 60_000) {
            return this.accessToken;
        }
        const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.authBaseUrl}/oauth/token`, {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
            audience: this.audience,
        }, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        }));
        const data = response.data;
        this.accessToken = data.access_token;
        this.tokenExpiresAt = now + (data.expires_in - 120) * 1000;
        this.logger.log('Reloadly access token acquired');
        return this.accessToken;
    }
    async request(method, path, body) {
        if (!this.isConfigured()) {
            throw new Error('Reloadly is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.');
        }
        const token = await this.getAccessToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/com.reloadly.giftcards-v1+json',
            'Content-Type': 'application/json',
        };
        try {
            const response = method === 'get'
                ? await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.apiBaseUrl}${path}`, { headers }))
                : await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.apiBaseUrl}${path}`, body, {
                    headers,
                }));
            return response.data;
        }
        catch (error) {
            const err = error;
            const message = err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Unknown Reloadly error';
            this.logger.error(`Reloadly ${method.toUpperCase()} ${path} failed: ${message}`, err.stack);
            throw new Error(`Reloadly request failed: ${message}`);
        }
    }
    async getBrands(page = 0, size = 100) {
        return this.request('get', `/brands?page=${page}&size=${size}`);
    }
    async getProducts(params) {
        const { countryCode, page = 0, size = 100, includeRange = true, productName, } = params;
        const qs = [
            `page=${page}`,
            `size=${size}`,
            `includeRange=${includeRange ? 'true' : 'false'}`,
        ];
        if (countryCode)
            qs.push(`countryCode=${countryCode}`);
        if (productName)
            qs.push(`productName=${encodeURIComponent(productName)}`);
        return this.request('get', `/products?${qs.join('&')}`);
    }
    async getProduct(productId) {
        return this.request('get', `/products/${productId}`);
    }
    async createOrder(payload) {
        return this.request('post', '/orders', payload);
    }
    async getTransaction(transactionId) {
        return this.request('get', `/orders/transactions/${transactionId}`);
    }
    async getCards(transactionId) {
        return this.request('get', `/orders/transactions/${transactionId}/cards`);
    }
};
exports.ReloadlyClient = ReloadlyClient;
exports.ReloadlyClient = ReloadlyClient = ReloadlyClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], ReloadlyClient);
//# sourceMappingURL=reloadly.client.js.map