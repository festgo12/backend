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
var TatumWalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumWalletService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const client_1 = require("../../generated/client/index.js");
let TatumWalletService = TatumWalletService_1 = class TatumWalletService {
    configService;
    httpService;
    logger = new common_1.Logger(TatumWalletService_1.name);
    apiKey;
    baseUrl = 'https://api.tatum.io/v4';
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    get headers() {
        return { 'x-api-key': this.apiKey };
    }
    async getOrGenerateXpub(asset) {
        const envXpubKey = `TATUM_${asset}_XPUB`;
        const configuredXpub = this.configService.get(envXpubKey);
        if (configuredXpub) {
            return configuredXpub;
        }
        this.logger.log(`No explicit XPub found for ${asset} in environment. Generating a new key pair via Tatum...`);
        const dynamicWallet = await this.generateWallet(asset);
        return dynamicWallet.xpub;
    }
    async generateWallet(asset) {
        const chain = this.mapCurrencyToChain(asset);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/${chain}/wallet`, { headers: this.headers }).pipe((0, rxjs_1.retry)({
                count: 3,
                delay: (error, retryCount) => (0, rxjs_1.timer)(retryCount * 1000),
            })));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to generate wallet for ${asset}: ${error.response?.data?.message || error.message}`);
            throw new common_1.InternalServerErrorException(`Could not generate wallet infrastructure for ${asset}`);
        }
    }
    async generateAddress(asset, xpub, index) {
        const chain = this.mapCurrencyToChain(asset);
        try {
            const url = `${this.baseUrl}/${chain}/address/${xpub}/${index}`;
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(url, { headers: this.headers }).pipe((0, rxjs_1.retry)({
                count: 3,
                delay: (error, retryCount) => (0, rxjs_1.timer)(retryCount * 1000),
            })));
            if (!response.data || !response.data.address) {
                throw new Error('Address missing from Tatum response body');
            }
            return response.data.address;
        }
        catch (error) {
            this.logger.error(`Failed to generate address for ${asset}: ${error.response?.data?.message || error.message}`);
            throw new common_1.BadRequestException(`Failed to generate deposit address for ${asset}. Ensure XPub is valid.`);
        }
    }
    async generatePrivateKey(asset, mnemonic, index) {
        const chain = this.mapCurrencyToChain(asset);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/${chain}/wallet/priv`, { index, mnemonic }, { headers: this.headers }));
            return response.data.key;
        }
        catch (error) {
            this.logger.error(`Failed to generate private key for ${asset}: ${error.response?.data?.message || error.message}`);
            throw new common_1.InternalServerErrorException(`Secure key generation failed for asset ${asset}`);
        }
    }
    mapCurrencyToChain(currency) {
        switch (currency) {
            case client_1.Currency.BTC:
                return 'bitcoin';
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                return 'ethereum';
            default:
                throw new common_1.BadRequestException(`Unsupported crypto wallet network type: ${currency}`);
        }
    }
};
exports.TatumWalletService = TatumWalletService;
exports.TatumWalletService = TatumWalletService = TatumWalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], TatumWalletService);
//# sourceMappingURL=tatum-wallet.service.js.map