import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class PaystackService {
    private readonly configService;
    private readonly httpService;
    private readonly secretKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    initializeTransaction(email: string, amount: number, reference: string): Promise<any>;
    verifyTransaction(reference: string): Promise<any>;
}
