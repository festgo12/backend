import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
export declare class TatumWalletService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService);
    private get headers();
    getOrGenerateXpub(asset: Currency): Promise<string>;
    getAddressIndex(walletId: string): number;
    generateWallet(asset: Currency): Promise<{
        mnemonic: string;
        xpub: string;
    }>;
    generateAddress(asset: Currency, xpub: string, index: number): Promise<string>;
    generatePrivateKey(asset: Currency, mnemonic: string, index: number): Promise<string>;
    mapCurrencyToChain(currency: Currency): string;
    mapCurrencyToV4Chain(currency: Currency): string;
}
