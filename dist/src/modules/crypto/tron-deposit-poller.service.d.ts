import { OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { ChainClientService } from './chain-client.service';
export declare class TronDepositPollerService implements OnModuleInit {
    private readonly chainClient;
    private readonly config;
    private readonly depositRegistry;
    private readonly prisma;
    private readonly webhookProcessor;
    private readonly schedulerRegistry;
    private readonly logger;
    private isRunning;
    private static readonly JOB_NAME;
    constructor(chainClient: ChainClientService, config: CryptoConfigService, depositRegistry: DepositAddressRegistry, prisma: PrismaService, webhookProcessor: WebhookProcessorService, schedulerRegistry: SchedulerRegistry);
    onModuleInit(): void;
    pollTronDeposits(): Promise<void>;
    private getCursorBlock;
    private normalize;
}
