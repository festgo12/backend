import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { TatumWalletService } from './tatum-wallet.service';
export declare class TatumTransferService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly tatumWallet;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, tatumWallet: TatumWalletService);
    private get headers();
    transfer(params: {
        asset: Currency;
        fromAddress: string;
        fromIndex: number;
        to: string;
        amount: string;
    }): Promise<string>;
    private buildTransferBody;
    recordOnChainTransaction(params: {
        walletId: string;
        orderId: string;
        asset: Currency;
        txId: string;
        fromAddress: string;
        to: string;
        amount: string;
        type: string;
        status?: string;
    }): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        fee: import("@src/generated/client/runtime/library").Decimal;
    }>;
}
