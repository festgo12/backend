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
var BtcDepositPollerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcDepositPollerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const chain_client_service_1 = require("./chain-client.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
let BtcDepositPollerService = BtcDepositPollerService_1 = class BtcDepositPollerService {
    prisma;
    walletService;
    depositRegistry;
    chainClient;
    config;
    logger = new common_1.Logger(BtcDepositPollerService_1.name);
    isRunning = false;
    constructor(prisma, walletService, depositRegistry, chainClient, config) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.depositRegistry = depositRegistry;
        this.chainClient = chainClient;
        this.config = config;
    }
    async scan() {
        if (!this.config.isAlchemy || this.isRunning)
            return;
        this.isRunning = true;
        try {
            const addresses = this.depositRegistry.addressesForChain('BTC');
            if (addresses.length === 0)
                return;
            const tip = await this.chainClient.getBtcTipHeight();
            if (!tip)
                return;
            const required = this.config.btcConfirmations;
            for (const address of addresses) {
                const utxos = await this.chainClient.getBtcUtxos(address);
                for (const utxo of utxos) {
                    const confirmations = tip - utxo.blockHeight + 1;
                    if (confirmations < required)
                        continue;
                    await this.creditDeposit({
                        address,
                        currency: client_1.Currency.BTC,
                        amount: utxo.value / 1e8,
                        txHash: utxo.txid,
                        sourceAddress: null,
                        confirmations,
                    });
                }
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`BTC deposit poll failed: ${err.message}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async creditDeposit(params) {
        const { address, currency, amount, txHash, sourceAddress, confirmations } = params;
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: txHash },
        });
        if (existing)
            return;
        const registrations = this.depositRegistry.lookup(address, 'BTC');
        if (registrations.length === 0)
            return;
        for (const reg of registrations) {
            const wallet = await this.prisma.wallet.findUnique({
                where: { id: reg.walletId },
            });
            if (!wallet || wallet.currency !== currency)
                continue;
            try {
                await this.walletService.createTransaction({
                    walletId: wallet.id,
                    type: client_1.LedgerType.DEPOSIT,
                    amount,
                    reference: txHash,
                    status: 'COMPLETED',
                    metadata: {
                        source: 'MEMPOOL_POLLER',
                        listener: 'BTC_POLLER',
                        blockTxId: txHash,
                        asset: currency,
                        address,
                        sourceAddress,
                        confirmations,
                        receivedAt: new Date().toISOString(),
                    },
                });
                this.logger.log(`Deposit credited: ${amount} ${currency} to wallet ${wallet.id} (TX: ${txHash})`);
            }
            catch (error) {
                const err = error;
                if (err.code === 'P2002') {
                    this.logger.debug(`Deposit ${txHash} already recorded for wallet ${wallet.id}; skipping`);
                }
                else {
                    this.logger.error(`Failed to credit deposit ${txHash} to wallet ${wallet.id}: ${err.message}`);
                }
            }
        }
    }
};
exports.BtcDepositPollerService = BtcDepositPollerService;
__decorate([
    (0, schedule_1.Cron)('0 */2 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BtcDepositPollerService.prototype, "scan", null);
exports.BtcDepositPollerService = BtcDepositPollerService = BtcDepositPollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        chain_client_service_1.ChainClientService,
        crypto_config_service_1.CryptoConfigService])
], BtcDepositPollerService);
//# sourceMappingURL=btc-deposit-poller.service.js.map