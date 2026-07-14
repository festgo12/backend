import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
export declare class TatumWalletService {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    private get headers();
    getOrGenerateXpub(asset: Currency): Promise<string>;
    generateWallet(asset: Currency): Promise<{
        mnemonic: string;
        xpub: string;
    }>;
    generateAddress(asset: Currency, xpub: string, index: number): Promise<string>;
    generatePrivateKey(asset: Currency, mnemonic: string, index: number): Promise<string>;
    private mapCurrencyToChain;
}
