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
var SweepService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SweepService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const chain_client_service_1 = require("./chain-client.service");
const crypto_config_service_1 = require("./crypto-config.service");
const hd_wallet_service_1 = require("./hd-wallet.service");
const withdrawal_tracker_service_1 = require("./withdrawal-tracker.service");
const platform_service_1 = require("./platform.service");
const exchange_rate_service_1 = require("./exchange-rate.service");
const client_1 = require("../../generated/client/index.js");
const ledger_service_1 = require("../wallet/ledger.service");
let SweepService = SweepService_1 = class SweepService {
    prisma;
    depositRegistry;
    chainClient;
    config;
    hdWallet;
    tracker;
    platformService;
    exchangeRate;
    ledger;
    logger = new common_1.Logger(SweepService_1.name);
    isRunning = false;
    constructor(prisma, depositRegistry, chainClient, config, hdWallet, tracker, platformService, exchangeRate, ledger) {
        this.prisma = prisma;
        this.depositRegistry = depositRegistry;
        this.chainClient = chainClient;
        this.config = config;
        this.hdWallet = hdWallet;
        this.tracker = tracker;
        this.platformService = platformService;
        this.exchangeRate = exchangeRate;
        this.ledger = ledger;
    }
    async sweepAll() {
        if (this.isRunning)
            return;
        if (this.config.depositSweepThreshold <= 0)
            return;
        try {
            await this.runSweep();
        }
        catch (error) {
            const err = error;
            this.logger.error(`Sweep run failed: ${err.message}`);
        }
    }
    async manualSweepAll() {
        if (this.isRunning) {
            throw new Error('Sweep already in progress');
        }
        try {
            return await this.runSweep();
        }
        catch (error) {
            const err = error;
            this.logger.error(`Manual sweep run failed: ${err.message}`);
            throw error;
        }
    }
    async manualSweepChain(chain) {
        if (!this.registryChains().includes(chain)) {
            throw new Error(`Unsupported sweep chain: ${chain}. Expected ${this.registryChains().join(', ')}.`);
        }
        if (this.isRunning) {
            throw new Error('Sweep already in progress');
        }
        this.isRunning = true;
        try {
            const summary = {
                evmSwept: 0,
                btcSwept: 0,
                solSwept: 0,
                tronSwept: 0,
                evmSkipped: 0,
                btcSkipped: 0,
                solSkipped: 0,
                tronSkipped: 0,
                errors: [],
                sweptByChain: {},
                skippedByChain: {},
            };
            const res = await this.sweepChain(chain);
            summary.errors.push(...res.errors);
            summary.sweptByChain[chain] = (summary.sweptByChain[chain] ?? 0) + res.swept;
            summary.skippedByChain[chain] =
                (summary.skippedByChain[chain] ?? 0) + res.skipped;
            if (chain === 'BTC') {
                summary.btcSwept += res.swept;
                summary.btcSkipped += res.skipped;
            }
            else if (this.config.isEvmChain(chain)) {
                summary.evmSwept += res.swept;
                summary.evmSkipped += res.skipped;
            }
            else if (chain === 'SOLANA') {
                summary.solSwept += res.swept;
                summary.solSkipped += res.skipped;
            }
            else if (chain === 'TRON') {
                summary.tronSwept += res.swept;
                summary.tronSkipped += res.skipped;
            }
            return summary;
        }
        finally {
            this.isRunning = false;
        }
    }
    registryChains() {
        return [...this.config.supportedChains, 'BTC'];
    }
    async runSweep() {
        if (this.isRunning) {
            throw new Error('Sweep already in progress');
        }
        this.isRunning = true;
        try {
            const summary = {
                evmSwept: 0,
                btcSwept: 0,
                solSwept: 0,
                tronSwept: 0,
                evmSkipped: 0,
                btcSkipped: 0,
                solSkipped: 0,
                tronSkipped: 0,
                errors: [],
                sweptByChain: {},
                skippedByChain: {},
            };
            for (const chain of this.registryChains()) {
                const res = await this.sweepChain(chain);
                summary.errors.push(...res.errors);
                summary.sweptByChain[chain] = (summary.sweptByChain[chain] ?? 0) + res.swept;
                summary.skippedByChain[chain] =
                    (summary.skippedByChain[chain] ?? 0) + res.skipped;
                if (chain === 'BTC') {
                    summary.btcSwept += res.swept;
                    summary.btcSkipped += res.skipped;
                }
                else if (this.config.isEvmChain(chain)) {
                    summary.evmSwept += res.swept;
                    summary.evmSkipped += res.skipped;
                }
                else if (chain === 'SOLANA') {
                    summary.solSwept += res.swept;
                    summary.solSkipped += res.skipped;
                }
                else if (chain === 'TRON') {
                    summary.tronSwept += res.swept;
                    summary.tronSkipped += res.skipped;
                }
            }
            return summary;
        }
        finally {
            this.isRunning = false;
        }
    }
    async sweepChain(chain) {
        const result = { swept: 0, skipped: 0, errors: [] };
        const addresses = this.depositRegistry.addressesForChain(chain);
        if (addresses.length === 0)
            return result;
        const chainConfig = await this.sweepConfigFor(chain);
        if (!chainConfig.enabled) {
            this.logger.log(`${chain} sweep disabled by config; skipping ${addresses.length} addresses`);
            return { swept: 0, skipped: addresses.length, errors: [] };
        }
        const thresholdUsd = chainConfig.thresholdUsd ?? this.config.depositSweepThreshold;
        for (const address of addresses) {
            const registrations = this.depositRegistry.lookup(address, chain);
            const seen = new Set();
            for (const reg of registrations) {
                const wallet = await this.prisma.wallet.findUnique({
                    where: { id: reg.walletId },
                });
                if (!wallet || seen.has(wallet.currency))
                    continue;
                seen.add(wallet.currency);
                if (wallet.derivationIndex === null ||
                    wallet.derivationIndex === hd_wallet_service_1.MASTER_WALLET_INDEX) {
                    result.skipped += 1;
                    continue;
                }
                const balance = await this.chainBalance(chain, wallet.currency, address);
                const balanceUsd = this.exchangeRate.convertToUsd(balance, wallet.currency);
                if (balanceUsd < thresholdUsd)
                    continue;
                this.logger.log(`${chain} sweep candidate: ${balance} ${wallet.currency} (~$${balanceUsd.toFixed(2)}) ≥ $${thresholdUsd}`);
                await this.sweepChainCurrency(chain, wallet.currency, wallet.derivationIndex, address, balance, result);
            }
        }
        return result;
    }
    async chainBalance(chain, currency, address) {
        if (chain === 'BTC') {
            const utxos = await this.chainClient.getBtcUtxos(address);
            return utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
        }
        if (this.config.isEvmChain(chain)) {
            return this.chainClient.getEvmBalance(address, currency, chain);
        }
        if (chain === 'SOLANA') {
            const mint = this.config.getStablecoinContractFor('SOLANA', currency);
            if (!mint)
                return 0;
            return this.chainClient.getSolanaTokenBalance(mint, address);
        }
        if (chain === 'TRON') {
            const contract = this.config.getStablecoinContractFor('TRON', currency);
            if (!contract)
                return 0;
            return this.chainClient.getTronTokenBalance(contract, address);
        }
        return 0;
    }
    async sweepChainCurrency(chain, currency, derivationIndex, fromAddress, balance, result) {
        const to = this.destinationAddress(chain);
        try {
            const txHash = await this.broadcastSweep(chain, currency, derivationIndex, to, balance);
            const wallet = await this.prisma.wallet.findFirst({
                where: { address: fromAddress, currency, derivationIndex },
            });
            if (wallet) {
                await this.recordSweep(chain, currency, balance, txHash, fromAddress);
                result.swept += 1;
            }
            else {
                result.errors.push(`${chain} ${currency} ${fromAddress}: source wallet not found; sweep not recorded`);
            }
        }
        catch (error) {
            const err = error;
            result.errors.push(`${chain} ${currency} ${fromAddress}: ${err.message}`);
            this.logger.error(`${chain} sweep failed for ${fromAddress} (${currency}): ${err.message}`);
        }
    }
    destinationAddress(chain) {
        if (chain === 'BTC')
            return this.hdWallet.getMasterAddress('BTC');
        if (this.config.isEvmChain(chain))
            return this.hdWallet.getMasterAddress('EVM');
        return this.hdWallet.getMasterAddressForChain(chain);
    }
    async broadcastSweep(chain, currency, fromIndex, to, amount) {
        if (chain === 'BTC') {
            const feePerByte = await this.chainClient.getBtcRecommendedFee();
            return this.chainClient.broadcastBtc(fromIndex, to, amount, feePerByte);
        }
        if (this.config.isEvmChain(chain)) {
            return currency === client_1.Currency.ETH
                ? this.chainClient.broadcastEvmNative(fromIndex, to, amount, chain)
                : this.chainClient.broadcastEvmToken(currency, fromIndex, to, amount, chain);
        }
        if (chain === 'SOLANA') {
            return this.chainClient.broadcastSolanaToken(currency, fromIndex, to, amount);
        }
        if (chain === 'TRON') {
            return this.chainClient.broadcastTronToken(currency, fromIndex, to, amount);
        }
        throw new Error(`Unsupported sweep chain: ${chain}`);
    }
    async recordSweep(chain, currency, amount, txHash, fromAddress) {
        const destination = this.destinationAddress(chain);
        const platformWallet = await this.platformService.getPlatformFeeWallet(currency, chain);
        if (!platformWallet) {
            throw new Error(`Platform fee wallet not found for ${currency}/${chain}`);
        }
        const sweepTx = await this.prisma.walletTransaction.create({
            data: {
                walletId: platformWallet.id,
                type: client_1.LedgerType.DEPOSIT,
                amount,
                status: 'PENDING',
                reference: txHash,
                metadata: {
                    destination,
                    blockchain: chain,
                    provider: 'alchemy',
                    sweep: true,
                    fromAddress,
                    initiatedAt: new Date().toISOString(),
                },
            },
        });
        await this.ledger.createEntry(this.prisma, {
            walletId: platformWallet.id,
            transactionId: sweepTx.id,
            amount,
            type: client_1.LedgerType.DEPOSIT,
            reference: `${txHash}-ledger`,
            metadata: {
                destination,
                blockchain: chain,
                provider: 'alchemy',
                sweep: true,
                fromAddress,
                initiatedAt: new Date().toISOString(),
            },
        });
        await this.tracker.enqueue({
            txHash,
            walletId: platformWallet.id,
            currency,
            chain,
            amount,
            destination,
            metadata: { source: 'DEPOSIT_SWEEP' },
        });
        await this.markMatchedDepositsSwept(chain, currency, fromAddress, txHash);
    }
    async markMatchedDepositsSwept(chain, currency, fromAddress, sweepTxHash) {
        if (!fromAddress)
            return;
        const evmFamily = this.config.isEvmChain(chain);
        const normalized = evmFamily ? fromAddress.toLowerCase() : fromAddress;
        const deposits = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                wallet: { currency },
            },
            take: 500,
            orderBy: { createdAt: 'desc' },
        });
        const sweptAt = new Date().toISOString();
        for (const tx of deposits) {
            const meta = (tx.metadata ?? {});
            if (meta.swept === true)
                continue;
            const txAddress = meta.address;
            if (!txAddress)
                continue;
            const match = evmFamily
                ? txAddress.toLowerCase() === normalized
                : txAddress === normalized;
            if (!match)
                continue;
            await this.prisma.walletTransaction.update({
                where: { id: tx.id },
                data: {
                    metadata: {
                        ...meta,
                        swept: true,
                        sweepTxHash,
                        sweptAt,
                    },
                },
            });
        }
    }
    async sweepConfigFor(chain) {
        const row = await this.prisma.sweepConfig.findUnique({
            where: { chain },
        });
        return {
            chain,
            enabled: row ? row.enabled : true,
            thresholdUsd: row?.thresholdUsd
                ? Number(row.thresholdUsd.toString())
                : null,
        };
    }
    async getSweepConfig() {
        const rows = await this.prisma.sweepConfig.findMany();
        const byChain = new Map(rows.map((r) => [r.chain, r]));
        const globalThresholdUsd = this.config.depositSweepThreshold;
        return {
            globalThresholdUsd,
            chains: this.registryChains().map((chain) => {
                const row = byChain.get(chain);
                return {
                    chain,
                    enabled: row ? row.enabled : true,
                    thresholdUsd: row?.thresholdUsd
                        ? Number(row.thresholdUsd.toString())
                        : null,
                    usesGlobalThreshold: !row?.thresholdUsd,
                };
            }),
        };
    }
    async updateSweepConfig(chain, changes) {
        if (!this.registryChains().includes(chain)) {
            throw new Error(`Unsupported sweep chain: ${chain}. Expected ${this.registryChains().join(', ')}.`);
        }
        const data = {};
        if (typeof changes.enabled === 'boolean')
            data.enabled = changes.enabled;
        if (changes.thresholdUsd !== undefined) {
            data.thresholdUsd =
                changes.thresholdUsd === null ? null : changes.thresholdUsd;
        }
        if (Object.keys(data).length === 0) {
            throw new Error('Nothing to update: provide enabled and/or thresholdUsd');
        }
        const row = await this.prisma.sweepConfig.upsert({
            where: { chain },
            create: { chain, ...data },
            update: data,
        });
        this.logger.log(`Sweep config updated for ${chain}: ${JSON.stringify(data)}`);
        return {
            chain: row.chain,
            enabled: row.enabled,
            thresholdUsd: row.thresholdUsd
                ? Number(row.thresholdUsd.toString())
                : null,
        };
    }
};
exports.SweepService = SweepService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SweepService.prototype, "sweepAll", null);
exports.SweepService = SweepService = SweepService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        chain_client_service_1.ChainClientService,
        crypto_config_service_1.CryptoConfigService,
        hd_wallet_service_1.HdWalletService,
        withdrawal_tracker_service_1.WithdrawalTrackerService,
        platform_service_1.PlatformService,
        exchange_rate_service_1.ExchangeRateService,
        ledger_service_1.LedgerService])
], SweepService);
//# sourceMappingURL=sweep.service.js.map