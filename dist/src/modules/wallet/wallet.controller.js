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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WalletController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const wallet_service_1 = require("./wallet.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const crypto_risk_service_1 = require("../security/crypto-risk.service");
const hd_wallet_service_1 = require("../crypto/hd-wallet.service");
const deposit_address_registry_service_1 = require("../crypto/deposit-address-registry.service");
const crypto_withdrawal_service_1 = require("../crypto/crypto-withdrawal.service");
const client_1 = require("../../generated/client/index.js");
const class_validator_1 = require("class-validator");
const audit_decorator_1 = require("../audit/audit.decorator");
let WalletController = WalletController_1 = class WalletController {
    walletService;
    exchangeRateService;
    cryptoRisk;
    hdWallet;
    depositRegistry;
    cryptoWithdrawal;
    logger = new common_1.Logger(WalletController_1.name);
    constructor(walletService, exchangeRateService, cryptoRisk, hdWallet, depositRegistry, cryptoWithdrawal) {
        this.walletService = walletService;
        this.exchangeRateService = exchangeRateService;
        this.cryptoRisk = cryptoRisk;
        this.hdWallet = hdWallet;
        this.depositRegistry = depositRegistry;
        this.cryptoWithdrawal = cryptoWithdrawal;
    }
    async getWallets(user) {
        return this.walletService.getUserWallets(user.id);
    }
    async getHistory(user, walletId, limit = 20, offset = 0) {
        const cleanWalletId = walletId?.trim();
        if (cleanWalletId &&
            cleanWalletId !== 'null' &&
            cleanWalletId !== 'undefined') {
            if (!(0, class_validator_1.isUUID)(cleanWalletId)) {
                throw new common_1.BadRequestException('walletId must be a valid UUID');
            }
            return this.walletService.getWalletHistory(cleanWalletId, limit, offset);
        }
        return this.walletService.getUserHistory(user.id, limit, offset);
    }
    getExchangeRates() {
        const rates = this.exchangeRateService.getAllRates();
        const info = this.exchangeRateService.getRateInfo();
        return {
            rates,
            lastUpdated: info.lastUpdated,
            ageMinutes: info.ageMinutes,
            source: info.source,
        };
    }
    async initWallet(user, currency) {
        const wallet = await this.walletService.getOrCreateWallet(user.id, currency);
        if (currency !== client_1.Currency.NGN && !wallet.address) {
            try {
                const info = await this.hdWallet.getOrAssignDepositInfo(user.id, currency);
                const updatedWallet = await this.walletService.updateWalletDepositInfo(wallet.id, {
                    address: info.address,
                    derivationIndex: info.derivationIndex,
                    chain: info.chain,
                });
                this.depositRegistry.register(info.address, info.chain, wallet.id);
                return updatedWallet;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to execute wallet initialization sequence for user ${user.id} (${currency}): ${message}`);
                throw new common_1.InternalServerErrorException(message ||
                    `Could not complete blockchain generation layer for ${currency}.`);
            }
        }
        return wallet;
    }
    async withdrawCrypto(user, walletId, address, amount) {
        if (!walletId || !(0, class_validator_1.isUUID)(walletId)) {
            throw new common_1.BadRequestException('Valid walletId is required');
        }
        if (!address || typeof address !== 'string') {
            throw new common_1.BadRequestException('Destination address is required');
        }
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const userWallet = await this.walletService.getUserWallets(user.id);
        const ownedWallet = userWallet.find((w) => w.id === walletId);
        if (!ownedWallet) {
            throw new common_1.BadRequestException('Wallet not found or access denied');
        }
        if (ownedWallet.currency === client_1.Currency.NGN) {
            throw new common_1.BadRequestException('NGN withdrawals use Paystack, not crypto withdrawal');
        }
        const chain = ownedWallet.currency === client_1.Currency.BTC ? 'bitcoin' : 'ethereum';
        const addressResult = await this.cryptoRisk.screenAddress(address.trim(), chain, 'withdrawal');
        if (!addressResult.isSafe) {
            this.logger.warn(`Withdrawal blocked by address screening: user=${user.id}, address=${address}, score=${addressResult.riskScore}`);
            throw new common_1.BadRequestException('Destination address failed security screening. Contact support if you believe this is an error.');
        }
        const txResult = await this.cryptoRisk.screenTransaction({
            userId: user.id,
            currency: ownedWallet.currency,
            amount,
            destinationAddress: address.trim(),
        });
        if (!txResult.approved) {
            this.logger.warn(`Withdrawal blocked by transaction screening: user=${user.id}, reasons=${txResult.reasons.join('; ')}`);
            throw new common_1.BadRequestException(`Transaction blocked: ${txResult.reasons[0]}. Contact support if you believe this is an error.`);
        }
        const result = await this.cryptoWithdrawal.processWithdrawal({
            walletId,
            amount,
            destinationAddress: address.trim(),
            currency: ownedWallet.currency,
        });
        return {
            success: true,
            txId: result.txId,
            status: result.status,
            message: 'Withdrawal submitted and awaiting blockchain confirmation',
        };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all wallets for the current user' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWallets", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get transaction history for a wallet or all user wallets',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)('walletId')),
    __param(2, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __param(3, (0, common_1.Query)('offset', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('rates'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current crypto-to-NGN exchange rates (cached)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WalletController.prototype, "getExchangeRates", null);
__decorate([
    (0, common_1.Post)('init'),
    (0, audit_decorator_1.AuditLog)('WALLET_CREATION', 'WALLET'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize a wallet for a specific currency' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "initWallet", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    (0, audit_decorator_1.AuditLog)('CRYPTO_WITHDRAWAL', 'WALLET'),
    (0, swagger_1.ApiOperation)({ summary: 'Withdraw crypto to an external address' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)('walletId')),
    __param(2, (0, common_1.Body)('address')),
    __param(3, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "withdrawCrypto", null);
exports.WalletController = WalletController = WalletController_1 = __decorate([
    (0, swagger_1.ApiTags)('Wallets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wallets'),
    __metadata("design:paramtypes", [wallet_service_1.WalletService,
        exchange_rate_service_1.ExchangeRateService,
        crypto_risk_service_1.CryptoRiskService,
        hd_wallet_service_1.HdWalletService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        crypto_withdrawal_service_1.CryptoWithdrawalService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map