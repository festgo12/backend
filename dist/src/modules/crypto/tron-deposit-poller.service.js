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
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const webhook_processor_service_1 = require("./webhook-processor.service");
const client_1 = require("../../generated/client/index.js");
let TronDepositPollerService = class TronDepositPollerService {
    static { TronDepositPollerService_1 = this; }
    httpService;
    config;
    depositRegistry;
    prisma;
    webhookProcessor;
    schedulerRegistry;
    logger = new common_1.Logger(TronDepositPollerService_1.name);
    isRunning = false;
    static JOB_NAME = 'tron_deposit_poller';
    constructor(httpService, config, depositRegistry, prisma, webhookProcessor, schedulerRegistry) {
        this.httpService = httpService;
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
            const active = new Set(addresses.map((a) => a.toLowerCase()));
            const cursor = await this.getCursor();
            for (const currency of [client_1.Currency.USDT, client_1.Currency.USDC]) {
                const contract = this.config.getStablecoinContractFor('TRON', currency);
                if (!contract)
                    continue;
                const transfers = await this.queryTrc20Transfers(contract, active, cursor.lastPolledAt);
                for (const transfer of transfers) {
                    const event = this.normalize(transfer, contract, currency);
                    if (!event)
                        continue;
                    await this.webhookProcessor.processEvent(event);
                }
                const lastTs = transfers.reduce((max, t) => Math.max(max, t.block_timestamp), cursor.lastPolledAt);
                if (lastTs > cursor.lastPolledAt) {
                    await this.prisma.chainCursor.upsert({
                        where: { chain: 'TRON' },
                        update: { lastBlock: Math.floor(lastTs / 1000) },
                        create: { chain: 'TRON', lastBlock: Math.floor(lastTs / 1000) },
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
    async getCursor() {
        const row = await this.prisma.chainCursor.findUnique({
            where: { chain: 'TRON' },
        });
        if (row && row.lastBlock > 0) {
            return { lastPolledAt: row.lastBlock * 1000 };
        }
        return { lastPolledAt: Date.now() - 24 * 60 * 60 * 1000 };
    }
    async queryTrc20Transfers(contract, active, minTimestamp) {
        const baseUrl = this.config.httpUrlForChain('TRON');
        if (!baseUrl) {
            this.logger.warn('ALCHEMY_TRON_HTTP_URL not configured; skipping poll');
            return [];
        }
        const seen = new Set();
        const out = [];
        const lowerContract = contract.toLowerCase();
        for (const address of active) {
            try {
                const url = `${baseUrl.replace(/\/+$/, '')}/v1/accounts/${address}/transactions/trc20`;
                const res = await (0, rxjs_1.lastValueFrom)(this.httpService.get(url, {
                    params: {
                        contract_address: contract,
                        min_timestamp: minTimestamp,
                        limit: 200,
                    },
                    timeout: 20_000,
                }));
                const data = Array.isArray(res.data?.data) ? res.data.data : [];
                for (const tx of data) {
                    if (tx.type !== 'Transfer')
                        continue;
                    const txContract = (tx.token_info?.address || '').toLowerCase();
                    if (txContract && txContract !== lowerContract)
                        continue;
                    const to = (tx.to || '').toLowerCase();
                    if (!active.has(to))
                        continue;
                    if (seen.has(tx.transaction_id))
                        continue;
                    seen.add(tx.transaction_id);
                    out.push(tx);
                }
            }
            catch (error) {
                const err = error;
                this.logger.warn(`TRON trc20 query failed for ${address}: ${err.message}`);
            }
        }
        return out;
    }
    normalize(tx, contract, currency) {
        if (!tx.transaction_id)
            return null;
        const value = Number(tx.value ?? 0) / 1e6;
        if (!Number.isFinite(value) || value <= 0)
            return null;
        const blockTimestamp = Math.floor((tx.block_timestamp || 0) / 1000);
        return {
            provider: 'tron_poller',
            chain: 'TRON',
            family: 'TRON',
            direction: 'INBOUND',
            txHash: tx.transaction_id,
            fromAddress: tx.from || '',
            toAddress: tx.to || '',
            asset: currency,
            amount: value,
            blockNumber: blockTimestamp,
            logIndex: undefined,
        };
    }
};
exports.TronDepositPollerService = TronDepositPollerService;
exports.TronDepositPollerService = TronDepositPollerService = TronDepositPollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        crypto_config_service_1.CryptoConfigService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        prisma_service_1.PrismaService,
        webhook_processor_service_1.WebhookProcessorService,
        schedule_1.SchedulerRegistry])
], TronDepositPollerService);
//# sourceMappingURL=tron-deposit-poller.service.js.map