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
var TatumReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const ledger_service_1 = require("../wallet/ledger.service");
const client_1 = require("../../generated/client/index.js");
const library_1 = require("../../generated/client/runtime/library");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
const tatum_platform_service_1 = require("./tatum-platform.service");
const tatum_deposit_service_1 = require("./tatum-deposit.service");
let TatumReconciliationService = TatumReconciliationService_1 = class TatumReconciliationService {
    configService;
    httpService;
    prisma;
    ledger;
    tatumWallet;
    platformService;
    logger = new common_1.Logger(TatumReconciliationService_1.name);
    apiKey;
    dataBaseUrl = 'https://api.tatum.io/v4';
    cryptoCurrencies = [
        client_1.Currency.BTC,
        client_1.Currency.ETH,
        client_1.Currency.USDT,
        client_1.Currency.USDC,
    ];
    constructor(configService, httpService, prisma, ledger, tatumWallet, platformService) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.ledger = ledger;
        this.tatumWallet = tatumWallet;
        this.platformService = platformService;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    get headers() {
        return { 'x-api-key': this.apiKey };
    }
    getTolerance() {
        return new library_1.Decimal(this.configService.get('RECONCILIATION_TOLERANCE', '0.00000001'));
    }
    autoAdjustEnabled() {
        return (this.configService.get('RECONCILIATION_AUTO_ADJUST', 'false') ===
            'true');
    }
    async getOnChainBalance(wallet) {
        if (!wallet.address)
            return 0;
        const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(wallet.currency);
        try {
            let balance;
            if (wallet.currency === client_1.Currency.BTC ||
                wallet.currency === client_1.Currency.ETH) {
                const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/blockchains/balance`, {
                    params: { chain: v4Chain, address: wallet.address },
                    headers: this.headers,
                }));
                balance = parseFloat(response.data?.balance || '0');
            }
            else {
                const contract = (0, tatum_deposit_service_1.getStablecoinContract)(wallet.currency, this.configService);
                if (!contract)
                    return 0;
                const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/wallet/portfolio`, {
                    params: {
                        chain: v4Chain,
                        addresses: wallet.address,
                        tokenTypes: 'fungible',
                    },
                    headers: this.headers,
                }));
                const match = (response.data?.result || []).find((r) => r.tokenAddress &&
                    String(r.tokenAddress).toLowerCase() === contract.toLowerCase());
                balance = parseFloat(match?.balance || '0');
            }
            return balance;
        }
        catch (error) {
            this.logger.warn(`Failed to fetch on-chain balance for ${wallet.currency} wallet ${wallet.id}: ${error.response?.data?.message || error.message}`);
            return 0;
        }
    }
    async reconcileAsset(asset, opts) {
        const applyAdjustment = opts?.applyAdjustment ?? this.autoAdjustEnabled();
        const agg = await this.prisma.wallet.aggregate({
            where: { currency: asset },
            _sum: { balance: true, reservedBalance: true },
        });
        const internalBalance = new library_1.Decimal(agg._sum.balance || 0).plus(agg._sum.reservedBalance || 0);
        const wallets = await this.prisma.wallet.findMany({
            where: { currency: asset, address: { not: null } },
        });
        let onChain = new library_1.Decimal(0);
        for (const wallet of wallets) {
            const bal = await this.getOnChainBalance(wallet);
            onChain = onChain.plus(bal);
        }
        const difference = internalBalance.minus(onChain);
        const tolerance = this.getTolerance();
        const absDiff = difference.abs();
        let status = absDiff.lte(tolerance) ? 'IN_BALANCE' : 'DISCREPANCY';
        const record = await this.prisma.reconciliation.create({
            data: {
                currency: asset,
                internalBalance,
                onChainBalance: onChain,
                difference,
                status,
                metadata: {
                    walletCount: wallets.length,
                    tolerance: tolerance.toString(),
                    onChainSources: wallets.length,
                },
            },
        });
        if (status === 'DISCREPANCY' && applyAdjustment && !difference.isZero()) {
            try {
                const feeWallet = await this.platformService.getPlatformFeeWallet(asset);
                if (feeWallet) {
                    await this.prisma.$transaction(async (tx) => {
                        await this.ledger.createEntry(tx, {
                            walletId: feeWallet.id,
                            amount: difference.toNumber(),
                            type: client_1.LedgerType.RECONCILIATION_ADJUSTMENT,
                            reference: `RECON-${asset}-${record.id}`,
                            metadata: {
                                reconciliationId: record.id,
                                internalBalance: internalBalance.toString(),
                                onChainBalance: onChain.toString(),
                            },
                        });
                    });
                    await this.prisma.reconciliation.update({
                        where: { id: record.id },
                        data: {
                            status: 'ADJUSTED',
                            reference: `RECON-${asset}-${record.id}`,
                        },
                    });
                    status = 'ADJUSTED';
                    this.logger.log(`Reconciliation ${asset}: adjusted fee wallet by ${difference.toString()}`);
                }
            }
            catch (error) {
                this.logger.error(`Reconciliation adjustment failed for ${asset}: ${error.message}`);
            }
        }
        if (status !== 'IN_BALANCE') {
            this.logger.warn(`Reconciliation ${asset}: internal=${internalBalance.toString()}, on-chain=${onChain.toString()}, diff=${difference.toString()} [${status}]`);
        }
        return {
            currency: asset,
            internalBalance: internalBalance.toString(),
            onChainBalance: onChain.toString(),
            difference: difference.toString(),
            status,
            reconciliationId: record.id,
        };
    }
    async reconcileAll() {
        const results = [];
        for (const asset of this.cryptoCurrencies) {
            try {
                results.push(await this.reconcileAsset(asset));
            }
            catch (error) {
                this.logger.error(`Reconciliation failed for ${asset}: ${error.message}`);
                results.push({
                    currency: asset,
                    status: 'ERROR',
                    error: error.message,
                });
            }
        }
        return { results };
    }
    async scheduledReconciliation() {
        await this.reconcileAll();
    }
};
exports.TatumReconciliationService = TatumReconciliationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TatumReconciliationService.prototype, "scheduledReconciliation", null);
exports.TatumReconciliationService = TatumReconciliationService = TatumReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        tatum_wallet_service_1.TatumWalletService,
        tatum_platform_service_1.TatumPlatformService])
], TatumReconciliationService);
//# sourceMappingURL=tatum-reconciliation.service.js.map