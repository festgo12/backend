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
var WithdrawalTrackerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalTrackerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const chain_client_service_1 = require("./chain-client.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
const MAX_ATTEMPTS = 60;
const MAX_BACKOFF_SEC = 600;
let WithdrawalTrackerService = WithdrawalTrackerService_1 = class WithdrawalTrackerService {
    prisma;
    walletService;
    chainClient;
    config;
    logger = new common_1.Logger(WithdrawalTrackerService_1.name);
    isProcessing = false;
    constructor(prisma, walletService, chainClient, config) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.chainClient = chainClient;
        this.config = config;
    }
    async enqueue(params) {
        const { txHash, walletId, currency, amount, destination, metadata } = params;
        return this.prisma.withdrawalJob.create({
            data: {
                txHash,
                walletId,
                currency,
                amount,
                destination,
                metadata: (metadata ?? {}),
            },
        });
    }
    async confirmFromWebhook(txHash, requiredConfirmations) {
        const job = await this.prisma.withdrawalJob.findUnique({
            where: { txHash },
        });
        if (!job || job.status !== 'PENDING')
            return;
        if (job.currency !== client_1.Currency.BTC) {
            const receipt = await this.chainClient.getEvmReceipt(txHash);
            if (receipt && receipt.status === 0) {
                await this.finalize(job, 'FAILED', {
                    lastError: 'Transaction reverted on-chain',
                    confirmedVia: 'webhook',
                    failedAt: new Date().toISOString(),
                });
                return;
            }
        }
        const currentMeta = (job.metadata ?? {});
        await this.prisma.withdrawalJob.update({
            where: { id: job.id },
            data: {
                metadata: {
                    ...currentMeta,
                    webhookConfirmed: true,
                    webhookConfirmations: requiredConfirmations,
                    lastWebhookAt: new Date().toISOString(),
                },
            },
        });
        await this.finalize(job, 'CONFIRMED', {
            confirmations: requiredConfirmations,
            confirmedVia: 'webhook',
            confirmedAt: new Date().toISOString(),
        });
    }
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            const due = await this.prisma.withdrawalJob.findMany({
                where: { status: 'PENDING', nextPollAt: { lte: new Date() } },
                take: 20,
                orderBy: { nextPollAt: 'asc' },
            });
            for (const job of due) {
                try {
                    await this.poll(job);
                }
                catch (error) {
                    const err = error;
                    this.logger.error(`Failed to poll withdrawal ${job.txHash}: ${err.message}`);
                }
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`Withdrawal queue processing error: ${err.message}`);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async poll(job) {
        const currency = job.currency;
        let confirmed = false;
        let failed = false;
        let confirmations = 0;
        let pollError = null;
        if (currency === client_1.Currency.BTC) {
            const tip = await this.chainClient.getBtcTipHeight();
            const status = await this.chainClient.getBtcTxStatus(job.txHash);
            if (status.error) {
                pollError = status.error;
            }
            else if (status.confirmed) {
                confirmations = status.blockHeight ? tip - status.blockHeight + 1 : 1;
                confirmed = confirmations >= this.config.btcConfirmations;
            }
        }
        else {
            const receipt = await this.chainClient.getEvmReceipt(job.txHash);
            if (receipt) {
                if (receipt.status === 0) {
                    failed = true;
                }
                else {
                    const latest = await this.chainClient.getLatestEvmBlock();
                    confirmations = latest - receipt.blockNumber + 1;
                    confirmed = confirmations >= this.config.evmConfirmations;
                }
            }
            else {
                pollError = 'transaction not found yet';
            }
        }
        if (confirmed) {
            await this.finalize(job, 'CONFIRMED', {
                confirmations,
                confirmedVia: 'polling',
                confirmedAt: new Date().toISOString(),
            });
            return;
        }
        if (failed) {
            await this.finalize(job, 'FAILED', {
                lastError: 'Transaction reverted on-chain',
                confirmedVia: 'polling',
                failedAt: new Date().toISOString(),
            });
            return;
        }
        const attempts = job.attempts + 1;
        const exhausted = attempts >= MAX_ATTEMPTS;
        const backoffSec = Math.min(20 * 2 ** Math.min(attempts, 8), MAX_BACKOFF_SEC);
        if (exhausted) {
            await this.finalize(job, 'FAILED', {
                lastError: 'Withdrawal not confirmed within the polling window',
                pollError: pollError || null,
                failedAt: new Date().toISOString(),
            });
            return;
        }
        await this.prisma.withdrawalJob.update({
            where: { id: job.id },
            data: { attempts, nextPollAt: new Date(Date.now() + backoffSec * 1000) },
        });
    }
    async finalize(job, status, extraMetadata) {
        await this.prisma.withdrawalJob.update({
            where: { id: job.id },
            data: {
                status,
                metadata: {
                    ...(job.metadata ?? {}),
                    ...extraMetadata,
                },
            },
        });
        const transaction = await this.prisma.walletTransaction.findUnique({
            where: { reference: job.txHash },
        });
        const transactionStatus = status === 'CONFIRMED' ? 'COMPLETED' : 'FAILED';
        if (transaction && transaction.status !== transactionStatus) {
            await this.walletService.updateTransactionStatus(transaction.id, transactionStatus, extraMetadata);
            const via = typeof extraMetadata.confirmedVia === 'string'
                ? extraMetadata.confirmedVia
                : 'unknown';
            this.logger.log(`Withdrawal ${job.txHash} ${status === 'CONFIRMED' ? 'confirmed' : 'failed'} (via ${via})`);
        }
    }
};
exports.WithdrawalTrackerService = WithdrawalTrackerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WithdrawalTrackerService.prototype, "processQueue", null);
exports.WithdrawalTrackerService = WithdrawalTrackerService = WithdrawalTrackerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        chain_client_service_1.ChainClientService,
        crypto_config_service_1.CryptoConfigService])
], WithdrawalTrackerService);
//# sourceMappingURL=withdrawal-tracker.service.js.map