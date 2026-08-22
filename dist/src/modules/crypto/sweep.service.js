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
const client_1 = require("../../generated/client/index.js");
let SweepService = SweepService_1 = class SweepService {
    prisma;
    depositRegistry;
    chainClient;
    config;
    hdWallet;
    tracker;
    platformService;
    logger = new common_1.Logger(SweepService_1.name);
    isRunning = false;
    constructor(prisma, depositRegistry, chainClient, config, hdWallet, tracker, platformService) {
        this.prisma = prisma;
        this.depositRegistry = depositRegistry;
        this.chainClient = chainClient;
        this.config = config;
        this.hdWallet = hdWallet;
        this.tracker = tracker;
        this.platformService = platformService;
    }
    async sweepAll() {
        if (this.isRunning)
            return;
        if (this.config.depositSweepThreshold <= 0)
            return;
        this.isRunning = true;
        try {
            await this.sweepEvm();
            await this.sweepBtc();
        }
        catch (error) {
            const err = error;
            this.logger.error(`Sweep run failed: ${err.message}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async manualSweepAll() {
        if (this.isRunning) {
            throw new Error('Sweep already in progress');
        }
        this.isRunning = true;
        try {
            await this.sweepEvm();
            await this.sweepBtc();
        }
        catch (error) {
            const err = error;
            this.logger.error(`Manual sweep run failed: ${err.message}`);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    async sweepEvm() {
        const addresses = this.depositRegistry.addressesForChain('EVM');
        if (addresses.length === 0)
            return;
        const threshold = this.config.depositSweepThreshold;
        for (const address of addresses) {
            const registrations = this.depositRegistry.lookup(address, 'EVM');
            const seen = new Set();
            for (const reg of registrations) {
                const wallet = await this.prisma.wallet.findUnique({
                    where: { id: reg.walletId },
                });
                if (!wallet || seen.has(wallet.currency))
                    continue;
                seen.add(wallet.currency);
                if (wallet.derivationIndex === null)
                    continue;
                const balance = await this.chainClient.getEvmBalance(address, wallet.currency);
                if (balance < threshold)
                    continue;
                await this.sweepEvmCurrency(wallet.currency, wallet.derivationIndex, address, balance);
            }
        }
    }
    async sweepBtc() {
        const addresses = this.depositRegistry.addressesForChain('BTC');
        if (addresses.length === 0)
            return;
        const threshold = this.config.depositSweepThreshold;
        for (const address of addresses) {
            const registrations = this.depositRegistry.lookup(address, 'BTC');
            const wallet = await this.prisma.wallet.findUnique({
                where: { id: registrations[0]?.walletId || '' },
            });
            if (!wallet || wallet.derivationIndex === null)
                continue;
            const utxos = await this.chainClient.getBtcUtxos(address);
            const balance = utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
            if (balance < threshold)
                continue;
            try {
                const feePerByte = await this.chainClient.getBtcRecommendedFee();
                const txid = await this.chainClient.broadcastBtc(wallet.derivationIndex, this.hdWallet.getMasterAddress('BTC'), balance, feePerByte);
                await this.recordSweep(client_1.Currency.BTC, balance, txid, address);
            }
            catch (error) {
                const err = error;
                this.logger.error(`BTC sweep failed for ${address}: ${err.message}`);
            }
        }
    }
    async sweepEvmCurrency(currency, derivationIndex, fromAddress, balance) {
        const to = this.hdWallet.getMasterAddress('EVM');
        try {
            const txHash = currency === client_1.Currency.ETH
                ? await this.chainClient.broadcastEvmNative(derivationIndex, to, balance)
                : await this.chainClient.broadcastEvmToken(currency, derivationIndex, to, balance);
            const wallet = await this.prisma.wallet.findFirst({
                where: { address: fromAddress, currency, derivationIndex },
            });
            if (wallet) {
                await this.recordSweep(currency, balance, txHash, fromAddress);
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`EVM sweep failed for ${fromAddress} (${currency}): ${err.message}`);
        }
    }
    async recordSweep(currency, amount, txHash, fromAddress) {
        const chain = currency === client_1.Currency.BTC ? 'BTC' : 'EVM';
        const destination = this.hdWallet.getMasterAddress(chain);
        const platformWallet = await this.platformService.getPlatformFeeWallet(currency);
        if (!platformWallet) {
            throw new Error(`Platform fee wallet not found for ${currency}`);
        }
        await this.prisma.walletTransaction.create({
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
        await this.tracker.enqueue({
            txHash,
            walletId: platformWallet.id,
            currency,
            amount,
            destination,
            metadata: { source: 'DEPOSIT_SWEEP' },
        });
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
        platform_service_1.PlatformService])
], SweepService);
//# sourceMappingURL=sweep.service.js.map