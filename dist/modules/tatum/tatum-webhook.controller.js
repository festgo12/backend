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
var TatumWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tatum_webhook_service_1 = require("./tatum-webhook.service");
const tatum_deposit_service_1 = require("./tatum-deposit.service");
const prisma_service_1 = require("../../core/database/prisma.service");
let TatumWebhookController = TatumWebhookController_1 = class TatumWebhookController {
    webhookService;
    depositService;
    prisma;
    logger = new common_1.Logger(TatumWebhookController_1.name);
    constructor(webhookService, depositService, prisma) {
        this.webhookService = webhookService;
        this.depositService = depositService;
        this.prisma = prisma;
    }
    async handleWebhook(payload, signature) {
        if (!this.webhookService.verifySignature(payload, signature)) {
            this.logger.error('Invalid Tatum webhook signature received.');
            throw new common_1.UnauthorizedException('Invalid signature');
        }
        this.logger.log(`Received Tatum webhook: ${payload.subscriptionType}`);
        switch (payload.subscriptionType) {
            case 'ADDRESS_TRANSACTION':
            case 'INCOMING_BLOCKCHAIN_TRANSACTION':
                await this.depositService.handleDepositNotification({
                    address: payload.address,
                    amount: payload.amount,
                    asset: payload.asset,
                    txId: payload.txId,
                    reference: payload.reference,
                });
                break;
            case 'CONFIRMATION_COUNT_REACHED':
                await this.handleConfirmation(payload);
                break;
            default:
                this.logger.log(`Unhandled webhook type: ${payload.subscriptionType}`);
        }
        return { received: true };
    }
    async simulateTestnetDeposit(currency, amount, address) {
        this.logger.log(`Simulating testnet deposit: ${amount} ${currency} (Address: ${address || 'any'})`);
        let wallet;
        if (address) {
            wallet = await this.prisma.wallet.findUnique({
                where: { address },
            });
        }
        else {
            wallet = await this.prisma.wallet.findFirst({
                where: {
                    currency: currency.toUpperCase(),
                    address: { not: null }
                },
            });
        }
        if (!wallet || !wallet.address) {
            throw new common_1.NotFoundException(`No wallet with address found for ${currency}`);
        }
        const txId = `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await this.depositService.handleDepositNotification({
            address: wallet.address,
            amount,
            asset: currency.toUpperCase(),
            txId,
        });
        await this.webhookService.markTransactionAsCompleted(txId);
        return {
            success: true,
            message: `Simulated ${amount} ${currency} deposit to ${wallet.address}`,
            txId,
            walletId: wallet.id,
            userId: wallet.userId
        };
    }
    async handleConfirmation(payload) {
        const { txId, confirmations } = payload;
        this.logger.log(`Transaction ${txId} reached ${confirmations} confirmations.`);
        const threshold = 3;
        if (confirmations >= threshold) {
            await this.webhookService.markTransactionAsCompleted(txId);
        }
    }
};
exports.TatumWebhookController = TatumWebhookController;
__decorate([
    (0, common_1.Post)('incoming'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Handle incoming Tatum webhooks' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tatum-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TatumWebhookController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('testnet/:currency/:amount'),
    (0, swagger_1.ApiOperation)({ summary: 'Simulate a Tatum testnet deposit for testing' }),
    __param(0, (0, common_1.Param)('currency')),
    __param(1, (0, common_1.Param)('amount')),
    __param(2, (0, common_1.Query)('address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TatumWebhookController.prototype, "simulateTestnetDeposit", null);
exports.TatumWebhookController = TatumWebhookController = TatumWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Tatum Webhooks'),
    (0, common_1.Controller)('tatum/webhooks'),
    __metadata("design:paramtypes", [tatum_webhook_service_1.TatumWebhookService,
        tatum_deposit_service_1.TatumDepositService,
        prisma_service_1.PrismaService])
], TatumWebhookController);
//# sourceMappingURL=tatum-webhook.controller.js.map