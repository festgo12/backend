import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@prisma/client';
export declare class TatumWalletService {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    private get headers();
    generateWallet(asset: Currency): Promise<{
        mnemonic: string;
        xpub: string;
    }>;
    generateAddress(asset: Currency, xpub: string, index: number): Promise<string>;
    generatePrivateKey(asset: Currency, mnemonic: string, index: number): Promise<string>;
    private mapCurrencyToChain;
}
