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
exports.TatumDepositService = exports.CRYPTO_CURRENCIES = exports.STABLECOIN_CONTRACTS_TESTNET = exports.STABLECOIN_CONTRACTS = void 0;
exports.getStablecoinContract = getStablecoinContract;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const client_1 = require("../../generated/client/index.js");
const tatum_wallet_service_1 = require("./tatum-wallet.service");
const tatum_risk_service_1 = require("./tatum-risk.service");
const tatum_webhook_service_1 = require("./tatum-webhook.service");
exports.STABLECOIN_CONTRACTS = {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};
exports.STABLECOIN_CONTRACTS_TESTNET = {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};
exports.CRYPTO_CURRENCIES = [
    client_1.Currency.BTC,
    client_1.Currency.ETH,
    client_1.Currency.USDT,
    client_1.Currency.USDC,
];
function getStablecoinContract(currency, configService) {
    const override = configService.get(`TATUM_${currency}_CONTRACT`);
    if (override)
        return override;
    const network = (configService.get('TATUM_NETWORK', 'mainnet') || 'mainnet').toLowerCase();
    if (network === 'testnet') {
        return exports.STABLECOIN_CONTRACTS_TESTNET[currency] || null;
    }
    return exports.STABLECOIN_CONTRACTS[currency] || null;
}
let TatumDepositService = TatumDepositService_1 = class TatumDepositService {
    configService;
    httpService;
    prisma;
    walletService;
    tatumWallet;
    riskService;
    webhookService;
    logger = new common_1.Logger(TatumDepositService_1.name);
    apiKey;
    dataBaseUrl = 'https://api.tatum.io/v4';
    constructor(configService, httpService, prisma, walletService, tatumWallet, riskService, webhookService) {
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
        this.riskService = riskService;
        this.webhookService = webhookService;
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
    async fetchConfirmations(asset, txId) {
        const currency = asset.toUpperCase();
        if (!Object.values(client_1.Currency).includes(currency)) {
            return 0;
        }
        if (!exports.CRYPTO_CURRENCIES.includes(currency)) {
            return 0;
        }
        const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(currency);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/blockchains/transaction`, {
                params: { chain: v4Chain, hash: txId },
                headers: { 'x-api-key': this.apiKey },
            }));
            const blockNumber = Number(response.data?.blockNumber || 0);
            if (!blockNumber)
                return 0;
            const info = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/blockchains/block/current`, {
                params: { chain: v4Chain },
                headers: { 'x-api-key': this.apiKey },
            }));
            const latest = Number(info.data || 0);
            return latest >= blockNumber ? latest - blockNumber + 1 : 1;
        }
        catch (error) {
            this.logger.warn(`Failed to fetch confirmations for ${asset} tx ${txId}: ${error.response?.data?.message || error.message}`);
            return 0;
        }
    }
    getMinConfirmations() {
        return Number(this.configService.get('TATUM_MIN_CONFIRMATIONS', 1));
    }
    async confirmDeposit(txId) {
        const tx = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (!tx)
            return { confirmed: false, confirmations: 0, reason: 'not_found' };
        if (tx.status === 'COMPLETED')
            return { confirmed: true, confirmations: 0, reason: 'already_completed' };
        if (tx.type !== client_1.LedgerType.DEPOSIT)
            return { confirmed: false, confirmations: 0, reason: 'not_a_deposit' };
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: tx.walletId },
        });
        if (!wallet)
            return { confirmed: false, confirmations: 0, reason: 'wallet_not_found' };
        if (!exports.CRYPTO_CURRENCIES.includes(wallet.currency)) {
            return { confirmed: false, confirmations: 0, reason: 'non_crypto_asset' };
        }
        const confirmations = await this.fetchConfirmations(wallet.currency, txId);
        if (confirmations >= this.getMinConfirmations()) {
            await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
                confirmations,
                confirmedAt: new Date().toISOString(),
            });
            this.logger.log(`Deposit ${txId} confirmed with ${confirmations} confirmations`);
            return { confirmed: true, confirmations };
        }
        return { confirmed: false, confirmations };
    }
    async confirmPendingDeposits() {
        const pending = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                wallet: {
                    currency: {
                        in: exports.CRYPTO_CURRENCIES,
                    },
                },
            },
            take: 100,
        });
        let confirmed = 0;
        for (const tx of pending) {
            try {
                const result = await this.confirmDeposit(tx.reference);
                if (result.confirmed)
                    confirmed++;
            }
            catch (error) {
                this.logger.error(`Failed to confirm deposit ${tx.reference}: ${error.message}`);
            }
        }
        if (pending.length > 0) {
            this.logger.log(`Deposit confirmation sweep: scanned ${pending.length}, confirmed ${confirmed}`);
        }
        return { scanned: pending.length, confirmed };
    }
    async confirmWithdrawal(txId) {
        const tx = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (!tx)
            return { confirmed: false, confirmations: 0, reason: 'not_found' };
        if (tx.status === 'COMPLETED')
            return { confirmed: true, confirmations: 0, reason: 'already_completed' };
        if (tx.type !== client_1.LedgerType.WITHDRAWAL)
            return { confirmed: false, confirmations: 0, reason: 'not_a_withdrawal' };
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: tx.walletId },
        });
        if (!wallet)
            return { confirmed: false, confirmations: 0, reason: 'wallet_not_found' };
        if (!exports.CRYPTO_CURRENCIES.includes(wallet.currency)) {
            return { confirmed: false, confirmations: 0, reason: 'non_crypto_asset' };
        }
        const confirmations = await this.fetchConfirmations(wallet.currency, txId);
        if (confirmations >= this.getMinConfirmations()) {
            await this.webhookService.markTransactionAsCompleted(txId);
            this.logger.log(`Withdrawal ${txId} confirmed with ${confirmations} confirmations`);
            return { confirmed: true, confirmations };
        }
        return { confirmed: false, confirmations };
    }
    async confirmPendingWithdrawals() {
        const pending = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.WITHDRAWAL,
                status: 'PENDING',
                wallet: {
                    currency: {
                        in: exports.CRYPTO_CURRENCIES,
                    },
                },
            },
            take: 100,
        });
        let confirmed = 0;
        for (const tx of pending) {
            try {
                const result = await this.confirmWithdrawal(tx.reference);
                if (result.confirmed)
                    confirmed++;
            }
            catch (error) {
                this.logger.error(`Failed to confirm withdrawal ${tx.reference}: ${error.message}`);
            }
        }
        if (pending.length > 0) {
            this.logger.log(`Withdrawal confirmation sweep: scanned ${pending.length}, confirmed ${confirmed}`);
        }
        return { scanned: pending.length, confirmed };
    }
    async syncBalanceWithBlockchain(walletId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
        });
        if (!wallet || !wallet.address) {
            this.logger.warn(`Cannot sync wallet ${walletId}: not found or no address`);
            return {
                synced: false,
                onChainBalance: 0,
                localBalance: 0,
                discrepancy: 0,
            };
        }
        const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(wallet.currency);
        try {
            let onChainBalance;
            if (wallet.currency === client_1.Currency.USDT ||
                wallet.currency === client_1.Currency.USDC) {
                const contract = getStablecoinContract(wallet.currency, this.configService);
                if (!contract) {
                    this.logger.warn(`No ${wallet.currency} contract configured for the active network. Skipping on-chain sync for wallet ${walletId}.`);
                    return {
                        synced: false,
                        onChainBalance: 0,
                        localBalance: wallet.balance.toNumber(),
                        discrepancy: 0,
                    };
                }
                const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/wallet/portfolio`, {
                    params: {
                        chain: v4Chain,
                        addresses: wallet.address,
                        tokenTypes: 'fungible',
                    },
                    headers: { 'x-api-key': this.apiKey },
                }));
                const match = (response.data?.result || []).find((r) => r.tokenAddress &&
                    String(r.tokenAddress).toLowerCase() === contract.toLowerCase());
                onChainBalance = parseFloat(match?.balance || '0');
            }
            else {
                const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.dataBaseUrl}/data/blockchains/balance`, {
                    params: { chain: v4Chain, address: wallet.address },
                    headers: { 'x-api-key': this.apiKey },
                }));
                onChainBalance = parseFloat(response.data?.balance || '0');
            }
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
            return {
                synced: false,
                onChainBalance: 0,
                localBalance: wallet.balance.toNumber(),
                discrepancy: 0,
            };
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
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TatumDepositService.prototype, "confirmPendingDeposits", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TatumDepositService.prototype, "confirmPendingWithdrawals", null);
exports.TatumDepositService = TatumDepositService = TatumDepositService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        tatum_wallet_service_1.TatumWalletService,
        tatum_risk_service_1.TatumRiskService,
        tatum_webhook_service_1.TatumWebhookService])
], TatumDepositService);
//# sourceMappingURL=tatum-deposit.service.js.map