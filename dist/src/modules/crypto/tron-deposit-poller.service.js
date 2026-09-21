"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TronDepositPollerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronDepositPollerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const webhook_processor_service_1 = require("./webhook-processor.service");
const chain_client_service_1 = require("./chain-client.service");
const client_1 = require("../../generated/client/index.js");
let TronDepositPollerService = class TronDepositPollerService {
    static { TronDepositPollerService_1 = this; }
    chainClient;
    config;
    depositRegistry;
    prisma;
    webhookProcessor;
    schedulerRegistry;
    logger = new common_1.Logger(TronDepositPollerService_1.name);
    isRunning = false;
    static JOB_NAME = 'tron_deposit_poller';
    constructor(chainClient, config, depositRegistry, prisma, webhookProcessor, schedulerRegistry) {
        this.chainClient = chainClient;
        this.config = config;
        this.depositRegistry = depositRegistry;
        this.prisma = prisma;
        this.webhookProcessor = webhookProcessor;
        this.schedulerRegistry = schedulerRegistry;
    }
    onModuleInit() {
        const cronExpression = this.config.tronPollCronSchedule;
        const job = new cron_1.CronJob(cronExpression, () => {
            void this.pollTronDeposits();
        });
        this.schedulerRegistry.addCronJob(TronDepositPollerService_1.JOB_NAME, job);
        job.start();
        this.logger.log(`TRON deposit poller cron scheduled: ${cronExpression}`);
    }
    async pollTronDeposits() {
        if (this.isRunning) {
            this.logger.debug('TRON poll already in progress; skipping');
            return;
        }
        this.isRunning = true;
        try {
            const addresses = this.depositRegistry.addressesForChain('TRON');
            if (addresses.length === 0) {
                this.logger.debug('No active TRON deposit addresses to poll');
                return;
            }
            const active = new Set(addresses);
            const cursor = await this.getCursorBlock();
            for (const currency of [client_1.Currency.USDT, client_1.Currency.USDC]) {
                const contract = this.config.getStablecoinContractFor('TRON', currency);
                if (!contract)
                    continue;
                let logs;
                try {
                    logs = await this.chainClient.fetchTronTransferLogs(contract, addresses, 200, cursor.lastBlock);
                }
                catch (error) {
                    const err = error;
                    this.logger.warn(`TRON TRC-20 log query failed for ${currency}: ${err.message}`);
                    continue;
                }
                for (const log of logs) {
                    if (!active.has(log.to))
                        continue;
                    const event = this.normalize(log, currency);
                    if (!event)
                        continue;
                    await this.webhookProcessor.processEvent(event);
                }
                const lastBlock = logs.reduce((max, l) => Math.max(max, l.blockNumber), cursor.lastBlock);
                if (lastBlock > cursor.lastBlock) {
                    await this.prisma.chainCursor.upsert({
                        where: { chain: 'TRON' },
                        update: { lastBlock },
                        create: { chain: 'TRON', lastBlock },
                    });
                }
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`TRON deposit poll failed: ${err.message}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async getCursorBlock() {
        const row = await this.prisma.chainCursor.findUnique({
            where: { chain: 'TRON' },
        });
        if (row && row.lastBlock > 0) {
            return { lastBlock: row.lastBlock };
        }
        return { lastBlock: 0 };
    }
    normalize(log, currency) {
        if (!log.txHash)
            return null;
        if (!Number.isFinite(log.amount) || log.amount <= 0)
            return null;
        return {
            provider: 'tron_poller',
            chain: 'TRON',
            family: 'TRON',
            direction: 'INBOUND',
            txHash: log.txHash,
            fromAddress: log.from || '',
            toAddress: log.to || '',
            asset: currency,
            amount: log.amount,
            blockNumber: log.blockNumber,
            logIndex: undefined,
        };
    }
};
exports.TronDepositPollerService = TronDepositPollerService;
exports.TronDepositPollerService = TronDepositPollerService = TronDepositPollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chain_client_service_1.ChainClientService,
        crypto_config_service_1.CryptoConfigService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        prisma_service_1.PrismaService,
        webhook_processor_service_1.WebhookProcessorService,
        schedule_1.SchedulerRegistry])
], TronDepositPollerService);
//# sourceMappingURL=tron-deposit-poller.service.js.map