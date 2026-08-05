import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from '../wallet/ledger.service';
import { Currency } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumPlatformService } from './tatum-platform.service';
export declare class TatumReconciliationService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly ledger;
    private readonly tatumWallet;
    private readonly platformService;
    private readonly logger;
    private readonly apiKey;
    private readonly dataBaseUrl;
    private readonly cryptoCurrencies;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, ledger: LedgerService, tatumWallet: TatumWalletService, platformService: TatumPlatformService);
    private get headers();
    private getTolerance;
    private autoAdjustEnabled;
    private getOnChainBalance;
    reconcileAsset(asset: Currency, opts?: {
        applyAdjustment?: boolean;
    }): Promise<{
        currency: Currency;
        internalBalance: string;
        onChainBalance: string;
        difference: string;
        status: string;
        reconciliationId: string;
    }>;
    reconcileAll(): Promise<{
        results: any[];
    }>;
    scheduledReconciliation(): Promise<void>;
}
