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
const wallet_service_1 = require("../wallet/wallet.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
let ReconciliationService = class ReconciliationService {
    static { ReconciliationService_1 = this; }
    prisma;
    walletService;
    config;
    httpService;
    schedulerRegistry;
    logger = new common_1.Logger(ReconciliationService_1.name);
    isRunning = false;
    static JOB_NAME = 'reconciliation';
    constructor(prisma, walletService, config, httpService, schedulerRegistry) {
        this.prisma = prisma;
        this.walletService = walletService;
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
        this.logger.log(`Reconciliation cron scheduled: ${cronExpression}`);
    }
    async runAutomatedReconciliation() {
        if (this.isRunning) {
            this.logger.debug('Reconciliation already in progress; skipping');
            return;
        }
        this.isRunning = true;
        try {
            this.logger.log('Starting automated reconciliation…');
            const result = await this.reconcileAll();
            this.logger.log(`Reconciliation complete: resolved=${result.resolved} missed=${result.missed} rollbacks=${result.rollbacks} pending=${result.pending} skippedTestnet=${result.skippedTestnet}`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Reconciliation failed: ${err.message}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async reconcileAll() {
        const [btcResult, evmResult] = await Promise.allSettled([
            this.reconcileBtc(),
            this.reconcileEvm(),
        ]);
        const btc = btcResult.status === 'fulfilled' ? btcResult.value : this.emptyResult();
        const evm = evmResult.status === 'fulfilled' ? evmResult.value : this.emptyResult();
        if (btcResult.status === 'rejected') {
            this.logger.error(`BTC reconciliation failed: ${btcResult.reason.message}`);
        }
        if (evmResult.status === 'rejected') {
            this.logger.error(`EVM reconciliation failed: ${evmResult.reason.message}`);
        }
        return this.mergeResults(btc, evm);
    }
    async reconcileCurrency(currency) {
        const chain = currency === client_1.Currency.BTC ? 'BTC' : 'EVM';
        if (chain === 'BTC') {
            return this.reconcileBtc();
        }
        return this.reconcileEvm();
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
    async reconcileEvm() {
        const result = this.emptyResult();
        const ethUrl = this.config.alchemyEthHttpUrl;
        if (!ethUrl) {
            this.logger.warn('ALCHEMY_ETH_HTTP_URL not configured; skipping EVM reconciliation');
            return result;
        }
        const evmWallets = await this.prisma.wallet.findMany({
            where: {
                currency: { in: [client_1.Currency.ETH, client_1.Currency.USDT, client_1.Currency.USDC] },
                address: { not: null },
            },
            select: { id: true, address: true, currency: true, isFrozen: true },
        });
        const evmAddresses = [
            ...new Set(evmWallets.map((w) => w.address.toLowerCase())),
        ];
        if (evmAddresses.length === 0) {
            this.logger.log('EVM reconciliation: no addresses found');
            return result;
        }
        const onChainTxs = await this.fetchEvmTransfers(ethUrl, evmAddresses);
        const onChainTxMap = new Map();
        for (const tx of onChainTxs) {
            onChainTxMap.set(tx.hash, tx);
        }
        this.logger.log(`EVM reconciliation: fetched ${onChainTxs.length} on-chain transfers`);
        const unresolved = await this.prisma.walletTransaction.findMany({
            where: {
                resolvedAt: null,
                reference: { not: { startsWith: 'testnet-credit-' } },
                wallet: {
                    currency: { in: [client_1.Currency.ETH, client_1.Currency.USDT, client_1.Currency.USDC] },
                },
            },
            include: {
                wallet: {
                    select: { id: true, currency: true, address: true, isFrozen: true },
                },
            },
        });
        this.logger.log(`EVM reconciliation: ${unresolved.length} unresolved DB transactions`);
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
                const staleThreshold = 30 * 60 * 1000;
                if (age > staleThreshold) {
                    await this.executeRollback(tx);
                    result.rollbacks++;
                }
                else {
                    result.pending++;
                }
            }
        }
        const allEvmRefs = new Set((await this.prisma.walletTransaction.findMany({
            where: {
                wallet: {
                    currency: { in: [client_1.Currency.ETH, client_1.Currency.USDT, client_1.Currency.USDC] },
                },
            },
            select: { reference: true },
        })).map((r) => r.reference));
        for (const onChainTx of onChainTxs) {
            if (allEvmRefs.has(onChainTx.hash))
                continue;
            if (onChainTx.hash.startsWith('testnet-credit-')) {
                result.skippedTestnet++;
                continue;
            }
            const credited = await this.autoCreditEvmDeposit(onChainTx, evmWallets);
            if (credited)
                result.missed++;
        }
        return result;
    }
    async fetchEvmTransfers(rpcUrl, addresses) {
        const allTransfers = [];
        const batchSize = 50;
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            let pageKey;
            do {
                try {
                    const params = {
                        toAddress: batch,
                        category: ['external', 'internal', 'erc20'],
                        fromBlock: '0x0',
                        toBlock: 'latest',
                        order: 'asc',
                        maxCount: '0x3e8',
                        withMetadata: false,
                    };
                    if (pageKey)
                        params.pageKey = pageKey;
                    const res = await (0, rxjs_1.lastValueFrom)(this.httpService.post(rpcUrl, {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'alchemy_getAssetTransfers',
                        params: [params],
                    }, { timeout: 30_000 }));
                    const data = res.data?.result;
                    const transfers = data?.transfers || [];
                    allTransfers.push(...transfers);
                    pageKey = data?.pageKey;
                }
                catch (error) {
                    const err = error;
                    this.logger.error(`EVM transfer fetch failed: ${err.message}`);
                    break;
                }
            } while (pageKey);
        }
        return allTransfers;
    }
    async autoCreditEvmDeposit(tx, wallets) {
        const toAddr = (tx.to || '').toLowerCase();
        const asset = (tx.asset || '').toUpperCase();
        let currency;
        if (asset === 'ETH' ||
            tx.category === 'external' ||
            tx.category === 'internal') {
            currency = client_1.Currency.ETH;
        }
        else if (asset === 'USDT') {
            currency = client_1.Currency.USDT;
        }
        else if (asset === 'USDC') {
            currency = client_1.Currency.USDC;
        }
        else {
            return false;
        }
        const matchingWallet = wallets.find((w) => w.address?.toLowerCase() === toAddr && w.currency === currency);
        if (!matchingWallet || matchingWallet.isFrozen)
            return false;
        const amount = tx.value;
        if (!Number.isFinite(amount) || amount <= 0)
            return false;
        const blockNum = parseInt(tx.blockNum, 16);
        try {
            await this.prisma.$transaction(async (prismaTx) => {
                await prismaTx.walletTransaction.create({
                    data: {
                        walletId: matchingWallet.id,
                        type: client_1.LedgerType.DEPOSIT,
                        status: 'COMPLETED',
                        amount,
                        reference: tx.hash,
                        resolvedAt: new Date(),
                        metadata: {
                            source: 'RECONCILIATION',
                            listener: 'EVM_RECONCILIATION',
                            blockTxId: tx.hash,
                            asset: currency,
                            address: toAddr,
                            sourceAddress: (tx.from || '').toLowerCase(),
                            blockNumber: blockNum,
                            missedEvent: true,
                            receivedAt: new Date().toISOString(),
                        },
                    },
                });
                await prismaTx.wallet.update({
                    where: { id: matchingWallet.id },
                    data: { balance: { increment: amount } },
                });
            });
            this.logger.log(`Missed EVM deposit auto-credited: ${amount} ${currency} to wallet ${matchingWallet.id} (TX: ${tx.hash})`);
            return true;
        }
        catch (error) {
            const err = error;
            if (err.code === 'P2002') {
                this.logger.debug(`EVM deposit ${tx.hash} already recorded; skipping`);
            }
            else {
                this.logger.error(`Failed to auto-credit EVM deposit ${tx.hash}: ${err.message}`);
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
    mergeResults(a, b) {
        return {
            resolved: a.resolved + b.resolved,
            missed: a.missed + b.missed,
            rollbacks: a.rollbacks + b.rollbacks,
            pending: a.pending + b.pending,
            skippedTestnet: a.skippedTestnet + b.skippedTestnet,
        };
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        crypto_config_service_1.CryptoConfigService,
        axios_1.HttpService,
        schedule_1.SchedulerRegistry])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map