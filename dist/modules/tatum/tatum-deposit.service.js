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
var TatumDepositService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumDepositService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const client_1 = require("../../generated/client/index.js");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
const tatum_risk_service_1 = require("./tatum-risk.service");
let TatumDepositService = TatumDepositService_1 = class TatumDepositService {
    configService;
    httpService;
    prisma;
    walletService;
    tatumWallet;
    riskService;
    logger = new common_1.Logger(TatumDepositService_1.name);
    apiKey;
    baseUrl = 'https://api.tatum.io/v3';
    constructor(configService, httpService, prisma, walletService, tatumWallet, riskService) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
        this.riskService = riskService;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    async handleDepositNotification(payload) {
        const { address, amount, asset, txId, sourceAddress } = payload;
        this.logger.log(`Processing deposit: ${amount} ${asset} to ${address} (TX: ${txId})`);
        const wallet = await this.prisma.wallet.findUnique({
            where: { address: address },
            include: { user: true },
        });
        if (!wallet) {
            this.logger.warn(`No wallet found for address ${address}. Ignoring deposit.`);
            return;
        }
        const existingTx = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (existingTx) {
            this.logger.log(`Transaction ${txId} already processed. Skipping.`);
            return;
        }
        if (sourceAddress) {
            try {
                const riskResult = await this.riskService.screenDeposit({
                    walletId: wallet.id,
                    amount: parseFloat(amount),
                    sourceAddress,
                    currency: asset,
                });
                if (!riskResult.safe) {
                    this.logger.warn(`Deposit flagged by risk screening: ${amount} ${asset} from ${sourceAddress}. ` +
                        `Score: ${riskResult.riskScore}, Reasons: ${riskResult.reasons.join('; ')}. ` +
                        `Recording as FLAGGED for manual review.`);
                    await this.walletService.createTransaction({
                        walletId: wallet.id,
                        type: client_1.LedgerType.DEPOSIT,
                        amount: parseFloat(amount),
                        reference: txId,
                        status: 'PENDING',
                        metadata: {
                            source: 'TATUM_WEBHOOK',
                            blockTxId: txId,
                            asset,
                            address,
                            sourceAddress,
                            riskFlagged: true,
                            riskScore: riskResult.riskScore,
                            riskReasons: riskResult.reasons,
                            receivedAt: new Date().toISOString(),
                        },
                    });
                    this.logger.log(`Flagged deposit recorded (PENDING): ${amount} ${asset} from ${sourceAddress} - requires review`);
                    return;
                }
            }
            catch (error) {
                this.logger.error(`Risk screening error during deposit: ${error.message}. Proceeding with deposit.`);
            }
        }
        await this.walletService.createTransaction({
            walletId: wallet.id,
            type: client_1.LedgerType.DEPOSIT,
            amount: parseFloat(amount),
            reference: txId,
            metadata: {
                source: 'TATUM_WEBHOOK',
                blockTxId: txId,
                asset,
                address,
                sourceAddress: sourceAddress || null,
                receivedAt: new Date().toISOString(),
            },
        });
        this.logger.log(`Deposit recorded (PENDING): ${amount} ${asset} to user ${wallet.userId}`);
    }
    async syncBalanceWithBlockchain(walletId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet || !wallet.address) {
            this.logger.warn(`Cannot sync wallet ${walletId}: not found or no address`);
            return { synced: false, onChainBalance: 0, localBalance: 0, discrepancy: 0 };
        }
        const chain = this.tatumWallet.mapCurrencyToChain(wallet.currency);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/${chain}/balance/${wallet.address}`, {
                headers: { 'x-api-key': this.apiKey },
            }));
            const onChainBalance = parseFloat(response.data?.balance || '0');
            const localBalance = wallet.balance.toNumber();
            const discrepancy = Math.abs(onChainBalance - localBalance);
            if (discrepancy > 0.00000001) {
                this.logger.warn(`Balance discrepancy for wallet ${walletId} (${wallet.currency}): ` +
                    `on-chain=${onChainBalance}, local=${localBalance}, diff=${discrepancy}`);
                await this.prisma.balanceSnapshot.create({
                    data: {
                        walletId,
                        balance: wallet.balance,
                        ledgerId: null,
                    },
                });
            }
            return { synced: true, onChainBalance, localBalance, discrepancy };
        }
        catch (error) {
            this.logger.error(`Failed to sync balance for wallet ${walletId}: ${error.message}`);
            return { synced: false, onChainBalance: 0, localBalance: wallet.balance.toNumber(), discrepancy: 0 };
        }
    }
    async syncAllWallets() {
        const wallets = await this.prisma.wallet.findMany({
            where: {
                currency: { not: 'NGN' },
                address: { not: null },
            },
        });
        let synced = 0;
        let discrepancies = 0;
        for (const wallet of wallets) {
            const result = await this.syncBalanceWithBlockchain(wallet.id);
            if (result.synced)
                synced++;
            if (result.discrepancy > 0.00000001)
                discrepancies++;
        }
        this.logger.log(`Balance sync complete: ${synced}/${wallets.length} synced, ${discrepancies} discrepancies`);
        return { total: wallets.length, synced, discrepancies };
    }
};
exports.TatumDepositService = TatumDepositService;
exports.TatumDepositService = TatumDepositService = TatumDepositService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        tatum_wallet_service_1.TatumWalletService,
        tatum_risk_service_1.TatumRiskService])
], TatumDepositService);
//# sourceMappingURL=tatum-deposit.service.js.map