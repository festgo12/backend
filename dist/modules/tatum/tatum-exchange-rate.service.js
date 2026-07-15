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
var TatumExchangeRateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumExchangeRateService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const rxjs_1 = require("rxjs");
let TatumExchangeRateService = TatumExchangeRateService_1 = class TatumExchangeRateService {
    configService;
    httpService;
    logger = new common_1.Logger(TatumExchangeRateService_1.name);
    cache = {
        rates: {},
        lastUpdated: new Date(0),
    };
    FALLBACK_RATES = {
        NGN: 1.0,
        USDT: 1550.0,
        USDC: 1545.0,
        BTC: 96000000.0,
        ETH: 5400000.0,
    };
    COINGECKO_MAP = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        USDT: 'tether',
        USDC: 'usd-coin',
    };
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
    }
    async onApplicationBootstrap() {
        await this.refreshRates();
    }
    async handleCronRefresh() {
        this.logger.log('Scheduled exchange rate refresh triggered');
        await this.refreshRates();
    }
    async refreshRates() {
        try {
            const coinIds = Object.values(this.COINGECKO_MAP).join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=ngn`;
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(url, {
                timeout: 10000,
                headers: { Accept: 'application/json' },
            }));
            const data = response.data;
            const rates = { NGN: 1.0 };
            for (const [currency, coinId] of Object.entries(this.COINGECKO_MAP)) {
                const price = data[coinId]?.ngn;
                if (price && typeof price === 'number' && price > 0) {
                    rates[currency] = price;
                }
                else {
                    rates[currency] = this.FALLBACK_RATES[currency] || 0;
                    this.logger.warn(`Using fallback rate for ${currency}: ${rates[currency]}`);
                }
            }
            this.cache = { rates, lastUpdated: new Date() };
            this.logger.log(`Exchange rates updated: BTC=${rates.BTC}, ETH=${rates.ETH}, USDT=${rates.USDT}, USDC=${rates.USDC}`);
            return rates;
        }
        catch (error) {
            this.logger.error(`Failed to fetch exchange rates from CoinGecko: ${error.message}`);
            const fallback = {};
            for (const [currency, rate] of Object.entries(this.FALLBACK_RATES)) {
                fallback[currency] = rate;
            }
            this.cache = { rates: fallback, lastUpdated: new Date() };
            return fallback;
        }
    }
    getRate(currency) {
        return this.cache.rates[currency] || this.FALLBACK_RATES[currency] || 0;
    }
    getAllRates() {
        return { ...this.cache.rates };
    }
    getLastUpdated() {
        return this.cache.lastUpdated;
    }
    convertToNgn(amount, currency) {
        const rate = this.getRate(currency);
        return amount * rate;
    }
    getRateInfo() {
        const ageMs = Date.now() - this.cache.lastUpdated.getTime();
        return {
            rates: this.getAllRates(),
            lastUpdated: this.cache.lastUpdated,
            ageMinutes: Math.round(ageMs / 60000),
            source: ageMs < 300000 ? 'CoinGecko (live)' : 'CoinGecko (cached)',
        };
    }
};
exports.TatumExchangeRateService = TatumExchangeRateService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TatumExchangeRateService.prototype, "handleCronRefresh", null);
exports.TatumExchangeRateService = TatumExchangeRateService = TatumExchangeRateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], TatumExchangeRateService);
//# sourceMappingURL=tatum-exchange-rate.service.js.map