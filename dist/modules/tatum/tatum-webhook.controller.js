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
const wallet_service_1 = require("../wallet/wallet.service");
let TatumWebhookController = TatumWebhookController_1 = class TatumWebhookController {
    webhookService;
    depositService;
    walletService;
    prisma;
    logger = new common_1.Logger(TatumWebhookController_1.name);
    CONFIRMATION_THRESHOLDS = {
        bitcoin: 3,
        ethereum: 12,
    };
    constructor(webhookService, depositService, walletService, prisma) {
        this.webhookService = webhookService;
        this.depositService = depositService;
        this.walletService = walletService;
        this.prisma = prisma;
    }
    async handleWebhook(payload, signature) {
        if (!this.webhookService.verifySignature(payload, signature)) {
            this.logger.error('Invalid Tatum webhook signature received.');
            throw new common_1.UnauthorizedException('Invalid signature');
        }
        this.logger.log(`Received Tatum webhook: ${payload.subscriptionType} | chain: ${payload.chain || 'unknown'}`);
        switch (payload.subscriptionType) {
            case 'ADDRESS_TRANSACTION':
            case 'INCOMING_BLOCKCHAIN_TRANSACTION':
                await this.handleIncomingDeposit(payload);
                break;
            case 'CONFIRMATION_COUNT_REACHED':
                await this.handleConfirmation(payload);
                break;
            case 'OUTGOING_BLOCKCHAIN_TRANSACTION':
                await this.handleOutgoingSuccess(payload);
                break;
            case 'OUTGOING_BLOCKCHAIN_TRANSACTION_FAILED':
                await this.handleOutgoingFailed(payload);
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
            wallet = await this.prisma.wallet.findUnique({ where: { address } });
        }
        else {
            wallet = await this.prisma.wallet.findFirst({
                where: {
                    currency: currency.toUpperCase(),
                    address: { not: null },
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
            userId: wallet.userId,
        };
    }
    async handleIncomingDeposit(payload) {
        const { address, amount, asset, txId, reference, from: sourceAddress } = payload;
        if (!address || !txId) {
            this.logger.warn('Incoming deposit webhook missing address or txId. Skipping.');
            return;
        }
        await this.depositService.handleDepositNotification({
            address,
            amount: String(amount),
            asset: asset || 'UNKNOWN',
            txId,
            reference,
            sourceAddress,
        });
    }
    async handleConfirmation(payload) {
        const { txId, confirmations, chain } = payload;
        if (!txId) {
            this.logger.warn('Confirmation webhook missing txId. Skipping.');
            return;
        }
        const threshold = this.CONFIRMATION_THRESHOLDS[chain] || 3;
        this.logger.log(`Transaction ${txId}: ${confirmations}/${threshold} confirmations (${chain})`);
        if (confirmations >= threshold) {
            await this.webhookService.markTransactionAsCompleted(txId);
        }
    }
    async handleOutgoingSuccess(payload) {
        const { txId } = payload;
        if (!txId) {
            this.logger.warn('Outgoing success webhook missing txId. Skipping.');
            return;
        }
        this.logger.log(`Outgoing transaction confirmed: ${txId}`);
        const transaction = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (!transaction) {
            this.logger.warn(`No pending withdrawal found for txId ${txId}`);
            return;
        }
        if (transaction.status === 'COMPLETED') {
            this.logger.log(`Transaction ${txId} already completed. Skipping.`);
            return;
        }
        await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED');
        this.logger.log(`Withdrawal ${txId} marked as COMPLETED`);
    }
    async handleOutgoingFailed(payload) {
        const { txId, error } = payload;
        if (!txId) {
            this.logger.warn('Outgoing failure webhook missing txId. Skipping.');
            return;
        }
        this.logger.error(`Outgoing transaction failed: ${txId} - ${error || 'unknown error'}`);
        const transaction = await this.prisma.walletTransaction.findUnique({
            where: { reference: txId },
        });
        if (!transaction || transaction.status === 'COMPLETED') {
            return;
        }
        await this.walletService.updateTransactionStatus(transaction.id, 'FAILED', {
            lastError: error || 'Blockchain transaction failed',
            failedAt: new Date().toISOString(),
        });
        this.logger.log(`Withdrawal ${txId} marked as FAILED`);
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
        wallet_service_1.WalletService,
        prisma_service_1.PrismaService])
], TatumWebhookController);
//# sourceMappingURL=tatum-webhook.controller.js.map