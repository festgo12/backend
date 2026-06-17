import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class TatumService {
    private readonly configService;
    private readonly httpService;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    generateWallet(chain: string): Promise<any>;
    generateAddress(chain: string, xpub: string, index: number): Promise<any>;
}
