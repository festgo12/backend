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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
let ReconciliationService = class ReconciliationService {
    static { ReconciliationService_1 = this; }
    prisma;
    config;
    httpService;
    schedulerRegistry;
    logger = new common_1.Logger(ReconciliationService_1.name);
    isRunning = false;
    static JOB_NAME = 'reconciliation';
    constructor(prisma, config, httpService, schedulerRegistry) {
        this.prisma = prisma;
        this.config = config;
        this.httpService = httpService;
        this.schedulerRegistry = schedulerRegistry;
    }
    onModuleInit() {
        const cronExpression = this.config.reconciliationCron;
        const job = new cron_1.CronJob(cronExpression, () => {
            void this.runAutomatedReconciliation();
        });
        this.schedulerRegistry.addCronJob(ReconciliationService_1.JOB_NAME, job);
        job.start();
        this.logger.log(`BTC reconciliation cron scheduled: ${cronExpression}`);
    }
    async runAutomatedReconciliation() {
        if (this.isRunning) {
            this.logger.debug('Reconciliation already in progress; skipping');
            return;
        }
        this.isRunning = true;
        try {
            this.logger.log('Starting automated BTC reconciliation…');
            const result = await this.reconcileAll();
            this.logger.log(`BTC reconciliation complete: resolved=${result.resolved} missed=${result.missed} rollbacks=${result.rollbacks} pending=${result.pending} skippedTestnet=${result.skippedTestnet}`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`BTC reconciliation failed: ${err.message}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async reconcileAll() {
        return this.reconcileBtc();
    }
    async reconcileCurrency(currency) {
        if (currency !== client_1.Currency.BTC) {
            this.logger.warn(`Reconciliation for ${currency} is not supported; only BTC is reconciled via cron`);
            return this.emptyResult();
        }
        return this.reconcileBtc();
    }
    async reconcileBtc() {
        const result = this.emptyResult();
        const xpub = this.config.btcMasterXpub;
        if (!xpub) {
            this.logger.warn('BTC xpub not configured; skipping BTC reconciliation');
            return result;
        }
        const btcUrl = this.config.alchemyBtcHttpUrl;
        if (!btcUrl) {
            this.logger.warn('ALCHEMY_BTC_HTTP_URL not configured; skipping BTC reconciliation');
            return result;
        }
        const onChainTxs = await this.fetchBtcXpubTxs(btcUrl, xpub);
        const onChainTxMap = new Map();
        for (const tx of onChainTxs) {
            onChainTxMap.set(tx.txid, tx);
        }
        this.logger.log(`BTC reconciliation: fetched ${onChainTxs.length} on-chain transactions`);
        const unresolved = await this.prisma.walletTransaction.findMany({
            where: {
                resolvedAt: null,
                reference: { not: { startsWith: 'testnet-credit-' } },
                wallet: { currency: client_1.Currency.BTC },
            },
            include: {
                wallet: {
                    select: { id: true, currency: true, address: true, isFrozen: true },
                },
            },
        });
        this.logger.log(`BTC reconciliation: ${unresolved.length} unresolved DB transactions`);
        for (const tx of unresolved) {
            const onChain = onChainTxMap.get(tx.reference);
            if (onChain) {
                await this.markResolved(tx.id);
                result.resolved++;
            }
            else if (tx.status === 'COMPLETED') {
                await this.executeRollback(tx);
                result.rollbacks++;
            }
            else if (tx.status === 'PENDING') {
                const age = Date.now() - tx.createdAt.getTime();
                const staleThreshold = 2 * 60 * 60 * 1000;
                if (age > staleThreshold) {
                    await this.executeRollback(tx);
                    result.rollbacks++;
                }
                else {
                    result.pending++;
                }
            }
        }
        const allBtcRefs = new Set((await this.prisma.walletTransaction.findMany({
            where: { wallet: { currency: client_1.Currency.BTC } },
            select: { reference: true },
        })).map((r) => r.reference));
        for (const onChainTx of onChainTxs) {
            if (allBtcRefs.has(onChainTx.txid))
                continue;
            if (onChainTx.txid.startsWith('testnet-credit-')) {
                result.skippedTestnet++;
                continue;
            }
            const credited = await this.autoCreditBtcDeposit(onChainTx);
            if (credited)
                result.missed++;
        }
        return result;
    }
    async fetchBtcXpubTxs(baseUrl, xpub) {
        const allTxs = [];
        let page = 1;
        let totalPages = 1;
        do {
            const url = `${baseUrl}/api/v2/xpub/${encodeURIComponent(xpub)}?details=txs&pageSize=1000&page=${page}`;
            try {
                const res = await (0, rxjs_1.lastValueFrom)(this.httpService.get(url, { timeout: 30_000 }));
                const data = res.data;
                allTxs.push(...(data.txs || []));
                totalPages = data.totalPages || 1;
                page++;
            }
            catch (error) {
                const err = error;
                this.logger.error(`BTC xpub fetch failed (page ${page}): ${err.message}`);
                break;
            }
        } while (page <= totalPages);
        return allTxs;
    }
    async autoCreditBtcDeposit(tx) {
        const voutAddresses = tx.vout.flatMap((o) => o.addresses || []);
        for (const addr of voutAddresses) {
            const registrations = await this.prisma.wallet.findMany({
                where: { address: addr, currency: client_1.Currency.BTC },
                select: { id: true, currency: true, isFrozen: true },
            });
            for (const wallet of registrations) {
                if (wallet.isFrozen)
                    continue;
                const amount = Math.abs(parseFloat(tx.value || '0'));
                if (amount <= 0)
                    continue;
                try {
                    await this.prisma.$transaction(async (prismaTx) => {
                        await prismaTx.walletTransaction.create({
                            data: {
                                walletId: wallet.id,
                                type: client_1.LedgerType.DEPOSIT,
                                status: 'COMPLETED',
                                amount,
                                reference: tx.txid,
                                resolvedAt: new Date(),
                                metadata: {
                                    source: 'RECONCILIATION',
                                    listener: 'BTC_RECONCILIATION',
                                    blockTxId: tx.txid,
                                    asset: client_1.Currency.BTC,
                                    address: addr,
                                    blockNumber: tx.blockHeight,
                                    confirmations: tx.confirmations,
                                    missedEvent: true,
                                    receivedAt: new Date().toISOString(),
                                },
                            },
                        });
                        await prismaTx.wallet.update({
                            where: { id: wallet.id },
                            data: { balance: { increment: amount } },
                        });
                    });
                    this.logger.log(`Missed BTC deposit auto-credited: ${amount} BTC to wallet ${wallet.id} (TX: ${tx.txid})`);
                    return true;
                }
                catch (error) {
                    const err = error;
                    if (err.code === 'P2002') {
                        this.logger.debug(`BTC deposit ${tx.txid} already recorded; skipping`);
                    }
                    else {
                        this.logger.error(`Failed to auto-credit BTC deposit ${tx.txid}: ${err.message}`);
                    }
                }
            }
        }
        return false;
    }
    async markResolved(transactionId) {
        await this.prisma.walletTransaction.update({
            where: { id: transactionId },
            data: { resolvedAt: new Date() },
        });
    }
    async executeRollback(tx) {
        const meta = (tx.metadata || {});
        this.logger.warn(`Rollback detected: ${tx.reference} — reverting ${String(tx.amount)} from wallet ${tx.walletId}`);
        await this.prisma.$transaction(async (prismaTx) => {
            const wallet = await prismaTx.wallet.findUniqueOrThrow({
                where: { id: tx.walletId },
            });
            const newBalance = new client_1.Prisma.Decimal(wallet.balance.toString()).minus(new client_1.Prisma.Decimal(tx.amount));
            await prismaTx.wallet.update({
                where: { id: tx.walletId },
                data: {
                    balance: newBalance,
                    isFrozen: true,
                },
            });
            await prismaTx.walletTransaction.update({
                where: { id: tx.id },
                data: {
                    status: 'CANCELLED',
                    resolvedAt: new Date(),
                    metadata: {
                        ...meta,
                        rollbackDetectedAt: new Date().toISOString(),
                        rollbackReason: 'Transaction missing/reverted on-chain during reconciliation',
                    },
                },
            });
            await prismaTx.ledgerEntry.create({
                data: {
                    walletId: tx.walletId,
                    amount: new client_1.Prisma.Decimal(tx.amount).negated(),
                    type: client_1.LedgerType.RECONCILIATION_ADJUSTMENT,
                    reference: `${tx.reference}-rollback-${Date.now()}`,
                    balanceAfter: newBalance,
                    metadata: {
                        reason: 'RECONCILIATION_ROLLBACK',
                        originalReference: tx.reference,
                    },
                },
            });
        });
    }
    emptyResult() {
        return {
            resolved: 0,
            missed: 0,
            rollbacks: 0,
            pending: 0,
            skippedTestnet: 0,
        };
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crypto_config_service_1.CryptoConfigService,
        axios_1.HttpService,
        schedule_1.SchedulerRegistry])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map