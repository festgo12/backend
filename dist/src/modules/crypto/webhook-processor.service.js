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
var WebhookProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookProcessorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const crypto_config_service_1 = require("./crypto-config.service");
const withdrawal_tracker_service_1 = require("./withdrawal-tracker.service");
const client_1 = require("../../generated/client/index.js");
let WebhookProcessorService = WebhookProcessorService_1 = class WebhookProcessorService {
    prisma;
    walletService;
    depositRegistry;
    config;
    tracker;
    logger = new common_1.Logger(WebhookProcessorService_1.name);
    constructor(prisma, walletService, depositRegistry, config, tracker) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.depositRegistry = depositRegistry;
        this.config = config;
        this.tracker = tracker;
    }
    async processAlchemyEvent(payload) {
        const event = payload.event;
        if (!event)
            return;
        const activity = event.activity;
        if (!Array.isArray(activity) || activity.length === 0)
            return;
        for (const item of activity) {
            const normalized = this.normalizeAlchemyActivity(item);
            if (!normalized)
                continue;
            await this.processEvent(normalized);
        }
    }
    normalizeAlchemyActivity(item) {
        const hash = item.hash;
        const from = (item.fromAddress || '').toLowerCase();
        const to = (item.toAddress || '').toLowerCase();
        const blockNum = parseInt(item.blockNum, 16);
        if (!hash || !to || !Number.isFinite(blockNum))
            return null;
        const category = item.category;
        const asset = (item.asset || '').toUpperCase();
        const value = Number(item.value ?? 0);
        if (!Number.isFinite(value) || value <= 0)
            return null;
        let currency;
        if (category === 'external' || category === 'internal' || asset === 'ETH') {
            currency = client_1.Currency.ETH;
        }
        else if (asset === 'USDT') {
            currency = client_1.Currency.USDT;
        }
        else if (asset === 'USDC') {
            currency = client_1.Currency.USDC;
        }
        else {
            return null;
        }
        const isToOurs = this.depositRegistry.has(to, 'EVM');
        const isFromOurs = this.depositRegistry.has(from, 'EVM');
        const log = item.log;
        const removed = log?.removed === true;
        if (removed) {
            return {
                provider: 'alchemy',
                chain: 'EVM',
                direction: 'INBOUND',
                txHash: hash,
                fromAddress: from,
                toAddress: to,
                asset: currency,
                amount: value,
                blockNumber: blockNum,
                logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
                removed: true,
            };
        }
        if (isToOurs) {
            return {
                provider: 'alchemy',
                chain: 'EVM',
                direction: 'INBOUND',
                txHash: hash,
                fromAddress: from,
                toAddress: to,
                asset: currency,
                amount: value,
                blockNumber: blockNum,
                logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
            };
        }
        if (isFromOurs) {
            return {
                provider: 'alchemy',
                chain: 'EVM',
                direction: 'OUTBOUND',
                txHash: hash,
                fromAddress: from,
                toAddress: to,
                asset: currency,
                amount: value,
                blockNumber: blockNum,
                logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
            };
        }
        return null;
    }
    async processBtcEvent(event) {
        await this.processEvent(event);
    }
    async processEvent(event) {
        if (event.direction === 'INBOUND') {
            await this.processDeposit(event);
        }
        else {
            await this.processWithdrawalConfirmation(event);
        }
    }
    async processDeposit(event) {
        if (event.removed) {
            await this.cancelRemovedDeposit(event.txHash);
            return;
        }
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: event.txHash },
        });
        if (existing)
            return;
        const chain = event.chain;
        const address = chain === 'EVM' ? event.toAddress.toLowerCase() : event.toAddress;
        const registrations = this.depositRegistry.lookup(address, chain);
        if (registrations.length === 0)
            return;
        for (const reg of registrations) {
            const wallet = await this.prisma.wallet.findUnique({
                where: { id: reg.walletId },
            });
            if (!wallet || wallet.currency !== event.asset)
                continue;
            const requiredConfirmations = event.chain === 'EVM'
                ? this.config.evmConfirmations
                : this.config.btcConfirmations;
            const canCreditImmediately = event.blockNumber > 0;
            const status = canCreditImmediately ? 'COMPLETED' : 'PENDING';
            const metadata = {
                source: event.provider === 'alchemy' ? 'ALCHEMY_WEBHOOK' : 'BTC_WEBSOCKET',
                listener: event.provider === 'alchemy' ? 'EVM_WEBHOOK' : 'BTC_WEBSOCKET',
                blockTxId: event.txHash,
                asset: event.asset,
                address,
                sourceAddress: event.fromAddress,
                blockNumber: event.blockNumber,
                confirmations: canCreditImmediately ? requiredConfirmations : 0,
                receivedAt: new Date().toISOString(),
            };
            try {
                await this.walletService.createTransaction({
                    walletId: wallet.id,
                    type: client_1.LedgerType.DEPOSIT,
                    amount: event.amount,
                    reference: event.txHash,
                    status,
                    metadata,
                });
                if (status === 'COMPLETED') {
                    const created = await this.prisma.walletTransaction.findUnique({
                        where: { reference: event.txHash },
                    });
                    if (created && !created.resolvedAt) {
                        await this.prisma.walletTransaction.update({
                            where: { id: created.id },
                            data: { resolvedAt: new Date() },
                        });
                    }
                }
                this.logger.log(`Deposit ${status}: ${event.amount} ${event.asset} to wallet ${wallet.id} (TX: ${event.txHash}, block ${event.blockNumber})`);
            }
            catch (error) {
                const err = error;
                if (err.code === 'P2002') {
                    this.logger.debug(`Deposit ${event.txHash} already recorded for wallet ${wallet.id}; skipping`);
                }
                else {
                    this.logger.error(`Failed to record deposit ${event.txHash} for wallet ${wallet.id}: ${err.message}`);
                }
            }
        }
    }
    async cancelRemovedDeposit(txHash) {
        if (!txHash)
            return;
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: txHash },
        });
        if (!existing || existing.status !== 'PENDING')
            return;
        await this.walletService.updateTransactionStatus(existing.id, 'CANCELLED', {
            finalization: 'WEBHOOK_REORG_REMOVED',
            cancelledAt: new Date().toISOString(),
        });
        this.logger.warn(`Deposit cancelled (webhook reorg): ${txHash}`);
    }
    async processWithdrawalConfirmation(event) {
        const job = await this.prisma.withdrawalJob.findUnique({
            where: { txHash: event.txHash },
        });
        if (!job || job.status !== 'PENDING')
            return;
        const required = event.chain === 'EVM'
            ? this.config.evmConfirmations
            : this.config.btcConfirmations;
        await this.tracker.confirmFromWebhook(event.txHash, required);
        this.logger.log(`Withdrawal confirmed via webhook: ${event.txHash} (${event.amount} ${event.asset})`);
    }
};
exports.WebhookProcessorService = WebhookProcessorService;
exports.WebhookProcessorService = WebhookProcessorService = WebhookProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        crypto_config_service_1.CryptoConfigService,
        withdrawal_tracker_service_1.WithdrawalTrackerService])
], WebhookProcessorService);
//# sourceMappingURL=webhook-processor.service.js.map