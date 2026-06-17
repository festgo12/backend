import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class TatumRiskService {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    screenAddress(address: string, chain: string): Promise<{
        isSafe: boolean;
        riskScore: number;
    }>;
    screenTransaction(txData: any): Promise<boolean>;
}
