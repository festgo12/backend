import { OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency } from '@src/generated/client';
export interface ReconciliationResult {
    resolved: number;
    missed: number;
    rollbacks: number;
    pending: number;
    skippedTestnet: number;
}
export declare class ReconciliationService implements OnModuleInit {
    private readonly prisma;
    private readonly walletService;
    private readonly config;
    private readonly httpService;
    private readonly schedulerRegistry;
    private readonly logger;
    private isRunning;
    private static readonly JOB_NAME;
    constructor(prisma: PrismaService, walletService: WalletService, config: CryptoConfigService, httpService: HttpService, schedulerRegistry: SchedulerRegistry);
    onModuleInit(): void;
    runAutomatedReconciliation(): Promise<void>;
    reconcileAll(): Promise<ReconciliationResult>;
    reconcileCurrency(currency: Currency): Promise<ReconciliationResult>;
    private reconcileBtc;
    private fetchBtcXpubTxs;
    private autoCreditBtcDeposit;
    private reconcileEvm;
    private fetchEvmTransfers;
    private autoCreditEvmDeposit;
    private markResolved;
    private executeRollback;
    private emptyResult;
    private mergeResults;
}
