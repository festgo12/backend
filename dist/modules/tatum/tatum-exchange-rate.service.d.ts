import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
export declare class TatumExchangeRateService implements OnApplicationBootstrap {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private cache;
    private readonly FALLBACK_RATES;
    private readonly COINGECKO_MAP;
    constructor(configService: ConfigService, httpService: HttpService);
    onApplicationBootstrap(): Promise<void>;
    handleCronRefresh(): Promise<void>;
    refreshRates(): Promise<Record<string, number>>;
    getRate(currency: Currency): number;
    getAllRates(): Record<string, number>;
    getLastUpdated(): Date;
    convertToNgn(amount: number, currency: Currency): number;
    getRateInfo(): {
        rates: Record<string, number>;
        lastUpdated: Date;
        ageMinutes: number;
        source: string;
    };
}
