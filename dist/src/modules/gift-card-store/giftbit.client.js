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
var GiftbitClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftbitClient = exports.GIFTBIT_INFO_FUNDS_PENDING = exports.GIFTBIT_INFO_FUNDS_REQUIRED = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
exports.GIFTBIT_INFO_FUNDS_REQUIRED = 'INFO_CAMPAIGN_CREATED_FUNDS_REQUIRED';
exports.GIFTBIT_INFO_FUNDS_PENDING = 'INFO_CAMPAIGN_CREATED_FUNDS_PENDING';
let GiftbitClient = class GiftbitClient {
    static { GiftbitClient_1 = this; }
    configService;
    httpService;
    logger = new common_1.Logger(GiftbitClient_1.name);
    environment;
    baseUrl;
    token;
    static BASE_URLS = {
        testbed: 'https://api-testbed.giftbit.com/papi/v1',
        production: 'https://api.giftbit.com/papi/v1',
    };
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        const env = this.configService.get('GIFTBIT_ENV') || 'testbed';
        this.environment = env === 'production' ? 'production' : 'testbed';
        this.baseUrl = GiftbitClient_1.BASE_URLS[this.environment];
        this.token =
            this.configService.get(this.environment === 'testbed'
                ? 'GIFTBIT_TESTBED_API_TOKEN'
                : 'GIFTBIT_PRODUCTION_API_TOKEN') || '';
    }
    isConfigured() {
        return Boolean(this.token);
    }
    getEnvironment() {
        return this.environment;
    }
    async request(method, path, body) {
        if (!this.isConfigured()) {
            throw new Error('Giftbit is not configured. Set GIFTBIT_ENV and the corresponding GIFTBIT_*_API_TOKEN.');
        }
        const headers = {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        let attempts = 0;
        const maxAttempts = 4;
        let pendingDelayMs = 1000;
        while (attempts < maxAttempts) {
            attempts += 1;
            try {
                const response = method === 'get'
                    ? await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}${path}`, { headers }))
                    : await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}${path}`, body, {
                        headers,
                    }));
                return response.data;
            }
            catch (error) {
                const err = error;
                const status = err.response?.status;
                if (status === 429 && attempts < maxAttempts) {
                    const retryAfter = Number(err.response?.headers?.['retry-after'] || pendingDelayMs / 1000);
                    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
                        ? retryAfter * 1000
                        : pendingDelayMs;
                    pendingDelayMs *= 2;
                    this.logger.warn(`Giftbit rate limited (429), retrying ${path} in ${delayMs}ms (attempt ${attempts}/${maxAttempts})`);
                    await this.sleep(delayMs);
                    continue;
                }
                const message = err.response?.data?.error?.message ||
                    err.response?.data?.error?.code ||
                    err.message ||
                    'Unknown Giftbit error';
                this.logger.error(`Giftbit ${method.toUpperCase()} ${path} failed: ${message}`, err.stack);
                throw new Error(`Giftbit request failed: ${message}`);
            }
        }
        throw new Error(`Giftbit request failed: max retries exceeded for ${path}`);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async ping() {
        return this.request('get', '/ping');
    }
    async listBrands(params) {
        const { currencyisocode, embeddable, limit = 100, offset = 0 } = params;
        const qs = [`limit=${limit}`, `offset=${offset}`];
        if (currencyisocode)
            qs.push(`currencyisocode=${currencyisocode}`);
        if (embeddable !== undefined && embeddable !== null) {
            qs.push(`embeddable=${embeddable ? 'true' : 'false'}`);
        }
        return this.request('get', `/brands?${qs.join('&')}`);
    }
    async getBrand(brandCode) {
        return this.request('get', `/brands/${encodeURIComponent(brandCode)}`);
    }
    async createEmbedded(payload) {
        return this.request('post', '/embedded', payload);
    }
    async getGift(uuid) {
        return this.request('get', `/gifts/${encodeURIComponent(uuid)}`);
    }
    async listGifts(params) {
        const { campaignUuid, campaignId, status, limit = 20, offset = 0 } = params;
        const qs = [`limit=${limit}`, `offset=${offset}`];
        if (campaignUuid)
            qs.push(`campaign_uuid=${encodeURIComponent(campaignUuid)}`);
        if (campaignId)
            qs.push(`campaign_id=${encodeURIComponent(campaignId)}`);
        if (status)
            qs.push(`status=${encodeURIComponent(status)}`);
        return this.request('get', `/gifts?${qs.join('&')}`);
    }
    async getFunds() {
        return this.request('get', '/funds');
    }
};
exports.GiftbitClient = GiftbitClient;
exports.GiftbitClient = GiftbitClient = GiftbitClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], GiftbitClient);
//# sourceMappingURL=giftbit.client.js.map