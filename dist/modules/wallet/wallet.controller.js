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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const wallet_service_1 = require("./wallet.service");
const tatum_wallet_service_1 = require("../tatum/tatum-wallet.service");
const client_1 = require("@prisma/client");
let WalletController = class WalletController {
    walletService;
    tatumWallet;
    constructor(walletService, tatumWallet) {
        this.walletService = walletService;
        this.tatumWallet = tatumWallet;
    }
    async getWallets(user) {
        return this.walletService.getUserWallets(user.id);
    }
    async getHistory(walletId, limit = 20, offset = 0) {
        return this.walletService.getWalletHistory(walletId, limit, offset);
    }
    async initWallet(user, currency) {
        const wallet = await this.walletService.getOrCreateWallet(user.id, currency);
        if (currency !== client_1.Currency.NGN && !wallet.address) {
            try {
                const xpub = process.env[`TATUM_${currency}_XPUB`];
                if (xpub) {
                    const index = Math.abs(this.hashCode(wallet.id)) % 1000000;
                    const address = await this.tatumWallet.generateAddress(currency, xpub, index);
                    return this.walletService.updateWalletAddress(wallet.id, address);
                }
            }
            catch (error) {
                console.error('Failed to generate blockchain address:', error);
            }
        }
        return wallet;
    }
    hashCode(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++)
            h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return h;
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
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction history for a wallet' }),
    __param(0, (0, common_1.Query)('walletId')),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('offset', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('init'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize a wallet for a specific currency' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "initWallet", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('Wallets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wallets'),
    __metadata("design:paramtypes", [wallet_service_1.WalletService,
        tatum_wallet_service_1.TatumWalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map