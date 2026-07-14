import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
export declare class TatumWithdrawalService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly walletService;
    private readonly tatumWallet;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, walletService: WalletService, tatumWallet: TatumWalletService);
    processWithdrawal(params: {
        walletId: string;
        amount: number;
        destinationAddress: string;
        currency: Currency;
    }): Promise<{
        txId: any;
        status: string;
    }>;
    private mapCurrencyToChain;
    private buildTransferBody;
}
