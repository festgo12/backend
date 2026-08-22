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
var ExchangeRateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeRateService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const rxjs_1 = require("rxjs");
let ExchangeRateService = ExchangeRateService_1 = class ExchangeRateService {
    configService;
    httpService;
    logger = new common_1.Logger(ExchangeRateService_1.name);
    cache = {
        ngn: {},
        usd: {},
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
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=ngn,usd`;
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(url, {
                timeout: 10000,
                headers: { Accept: 'application/json' },
            }));
            const data = response.data;
            const ngn = { NGN: 1.0 };
            const usd = { NGN: 1.0 };
            for (const [currency, coinId] of Object.entries(this.COINGECKO_MAP)) {
                const ngnPrice = data[coinId]?.ngn;
                const usdPrice = data[coinId]?.usd;
                if (ngnPrice && typeof ngnPrice === 'number' && ngnPrice > 0) {
                    ngn[currency] = ngnPrice;
                }
                else {
                    ngn[currency] = this.FALLBACK_RATES[currency] || 0;
                    this.logger.warn(`Using fallback NGN rate for ${currency}: ${ngn[currency]}`);
                }
                if (usdPrice && typeof usdPrice === 'number' && usdPrice > 0) {
                    usd[currency] = usdPrice;
                }
                else {
                    usd[currency] = this.FALLBACK_RATES[currency]
                        ? this.FALLBACK_RATES[currency] / 1550
                        : 0;
                    this.logger.warn(`Using fallback USD rate for ${currency}: ${usd[currency]}`);
                }
            }
            this.cache = { ngn, usd, lastUpdated: new Date() };
            this.logger.log(`Exchange rates updated: BTC=$${usd.BTC} / ₦${ngn.BTC}, ETH=$${usd.ETH} / ₦${ngn.ETH}`);
            return ngn;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to fetch exchange rates from CoinGecko: ${message}`);
            const ngnFallback = {};
            const usdFallback = {};
            for (const [currency, rate] of Object.entries(this.FALLBACK_RATES)) {
                ngnFallback[currency] = rate;
                usdFallback[currency] = rate / 1550;
            }
            this.cache = {
                ngn: ngnFallback,
                usd: usdFallback,
                lastUpdated: new Date(),
            };
            return ngnFallback;
        }
    }
    getRate(currency) {
        return this.cache.ngn[currency] || this.FALLBACK_RATES[currency] || 0;
    }
    getUsdRate(currency) {
        return this.cache.usd[currency] || 0;
    }
    getAllRates() {
        return { ...this.cache.ngn };
    }
    getLastUpdated() {
        return this.cache.lastUpdated;
    }
    convertToNgn(amount, currency) {
        const rate = this.getRate(currency);
        return amount * rate;
    }
    convertToUsd(amount, currency) {
        const rate = this.getUsdRate(currency);
        return amount * rate;
    }
    getRateInfo() {
        const ageMs = Date.now() - this.cache.lastUpdated.getTime();
        return {
            rates: this.getAllRates(),
            usdRates: { ...this.cache.usd },
            lastUpdated: this.cache.lastUpdated,
            ageMinutes: Math.round(ageMs / 60000),
            source: ageMs < 300000 ? 'CoinGecko (live)' : 'CoinGecko (cached)',
        };
    }
};
exports.ExchangeRateService = ExchangeRateService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExchangeRateService.prototype, "handleCronRefresh", null);
exports.ExchangeRateService = ExchangeRateService = ExchangeRateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], ExchangeRateService);
//# sourceMappingURL=exchange-rate.service.js.map