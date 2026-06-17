import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class PaystackService {
    private readonly configService;
    private readonly httpService;
    private readonly secretKey;
    private readonly baseUrl;
    private readonly logger;
    constructor(configService: ConfigService, httpService: HttpService);
    initializeTransaction(email: string, amount: number, reference: string, metadata?: any): Promise<any>;
    verifyTransaction(reference: string): Promise<any>;
    listBanks(): Promise<any>;
    verifyAccountNumber(accountNumber: string, bankCode: string): Promise<any>;
    createTransferRecipient(name: string, accountNumber: string, bankCode: string): Promise<any>;
    initiateTransfer(amount: number, recipient: string, reason: string, reference: string): Promise<any>;
    verifySignature(payload: any, signature: string): boolean;
}
