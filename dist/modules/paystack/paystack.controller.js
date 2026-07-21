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
var PaystackController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackController = void 0;
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("../../generated/client/index.js");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const paystack_service_1 = require("./paystack.service");
const wallet_service_1 = require("../wallet/wallet.service");
const audit_decorator_1 = require("../audit/audit.decorator");
const initialize_deposit_dto_1 = require("./dto/initialize-deposit.dto");
const initiate_transfer_dto_1 = require("./dto/initiate-transfer.dto");
const verify_account_dto_1 = require("./dto/verify-account.dto");
const initiate_refund_dto_1 = require("./dto/initiate-refund.dto");
let PaystackController = PaystackController_1 = class PaystackController {
    paystackService;
    walletService;
    logger = new common_1.Logger(PaystackController_1.name);
    constructor(paystackService, walletService) {
        this.paystackService = paystackService;
        this.walletService = walletService;
    }
    async initialize(user, dto) {
        if (!user.email)
            throw new common_1.BadRequestException('User email is required for Paystack');
        try {
            const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const result = await this.paystackService.initializeTransaction(user.email, dto.amount, reference, {
                userId: user.id,
                type: 'DEPOSIT',
            });
            const wallet = await this.walletService.getOrCreateWallet(user.id, client_1.Currency.NGN);
            await this.walletService.createTransaction({
                walletId: wallet.id,
                type: client_1.LedgerType.DEPOSIT,
                amount: dto.amount,
                reference,
                status: 'PENDING',
                metadata: {
                    paystack_ref: result.data.reference,
                },
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Deposit initialization failed for ${user.email}: ${error.message}`);
            throw new common_1.BadRequestException(error.message || 'Failed to initialize deposit');
        }
    }
    async getBanks() {
        return this.paystackService.listBanks();
    }
    async verifyAccount(dto) {
        return this.paystackService.verifyAccountNumber(dto.accountNumber, dto.bankCode);
    }
    async verify(reference) {
        if (!reference)
            throw new common_1.BadRequestException('Reference is required');
        try {
            const verification = await this.paystackService.verifyTransaction(reference);
            if (verification && verification.status === true && verification.data.status === 'success') {
                const transaction = await this.walletService.findTransactionByReference(reference);
                if (transaction && transaction.status !== 'COMPLETED') {
                    this.logger.log(`Paystack manual verification success for ref: ${reference}`);
                    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
                        paystack_data: verification.data,
                    });
                }
                return { status: 'success', data: verification.data };
            }
            return { status: 'failed', message: 'Transaction not successful on Paystack' };
        }
        catch (error) {
            this.logger.error(`Paystack manual verification failed for ref ${reference}: ${error.message}`);
            throw new common_1.BadRequestException(error.message || 'Verification failed');
        }
    }
    async initiateTransfer(user, dto) {
        const wallet = await this.walletService.getOrCreateWallet(user.id, client_1.Currency.NGN);
        if (wallet.balance.toNumber() < dto.amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const recipientResult = await this.paystackService.createTransferRecipient(dto.accountName, dto.accountNumber, dto.bankCode);
        const recipientCode = recipientResult.data.recipient_code;
        const reference = `WDL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const transferResult = await this.paystackService.initiateTransfer(dto.amount, recipientCode, `P2N Withdrawal for ${user.email}`, reference);
        await this.walletService.createTransaction({
            walletId: wallet.id,
            type: client_1.LedgerType.WITHDRAWAL,
            amount: -dto.amount,
            reference,
            status: 'PROCESSING',
            metadata: {
                paystack_transfer_code: transferResult.data.transfer_code,
                paystack_recipient_code: recipientCode,
                account_number: dto.accountNumber,
                bank_code: dto.bankCode,
                account_name: dto.accountName,
            },
        });
        return transferResult;
    }
    async initiateRefund(user, dto) {
        const transaction = await this.walletService.findTransactionById(dto.transactionId);
        if (!transaction)
            throw new common_1.BadRequestException('Transaction not found');
        if (transaction.status !== 'COMPLETED')
            throw new common_1.BadRequestException('Only completed transactions can be refunded');
        const paystackRef = transaction.metadata?.paystack_ref;
        if (!paystackRef)
            throw new common_1.BadRequestException('No Paystack reference found for this transaction');
        const refundResult = await this.paystackService.initiateRefund(paystackRef, dto.amount);
        await this.walletService.reverseTransaction(dto.transactionId, `Refund initiated by admin ${user.email}`);
        return refundResult;
    }
    async handleWebhook(req, payload, signature) {
        const rawBody = req.rawBody;
        if (!rawBody || !this.paystackService.verifySignature(rawBody, signature)) {
            this.logger.warn('Invalid Paystack Webhook Signature received');
            throw new common_1.BadRequestException('Invalid signature');
        }
        this.logger.log(`Received Paystack Webhook: ${payload.event}`);
        switch (payload.event) {
            case 'charge.success':
                await this.handleChargeSuccess(payload.data);
                break;
            case 'transfer.success':
                await this.handleTransferSuccess(payload.data);
                break;
            case 'transfer.failed':
                await this.handleTransferFailed(payload.data);
                break;
            case 'transfer.reversed':
                await this.handleTransferReversed(payload.data);
                break;
            default:
                this.logger.log(`Unhandled Paystack event: ${payload.event}`);
        }
        return { status: 'success' };
    }
    async handleChargeSuccess(data) {
        this.logger.log(`Handling charge.success for ref: ${data.reference}`);
        const transaction = await this.walletService.findTransactionByReference(data.reference);
        if (!transaction || transaction.status === 'COMPLETED')
            return;
        await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
            paystack_data: data,
        });
    }
    async handleTransferSuccess(data) {
        this.logger.log(`Handling transfer.success for ref: ${data.reference}`);
        const transaction = await this.walletService.findTransactionByReference(data.reference);
        if (!transaction || transaction.status === 'COMPLETED')
            return;
        await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
            paystack_data: data,
        });
    }
    async handleTransferFailed(data) {
        this.logger.log(`Handling transfer.failed for ref: ${data.reference}`);
        const transaction = await this.walletService.findTransactionByReference(data.reference);
        if (!transaction || transaction.status === 'FAILED' || transaction.status === 'REVERSED')
            return;
        await this.walletService.reverseTransaction(transaction.id, data.reason || 'Transfer failed');
    }
    async handleTransferReversed(data) {
        this.logger.log(`Handling transfer.reversed for ref: ${data.reference}`);
        const transaction = await this.walletService.findTransactionByReference(data.reference);
        if (!transaction || transaction.status === 'REVERSED')
            return;
        await this.walletService.reverseTransaction(transaction.id, 'Transfer reversed by Paystack');
    }
};
exports.PaystackController = PaystackController;
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('initialize'),
    (0, audit_decorator_1.AuditLog)('WALLET_DEPOSIT', 'WALLET'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize a deposit transaction' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initialize_deposit_dto_1.InitializeDepositDto]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "initialize", null);
__decorate([
    (0, common_1.Get)('banks'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of supported banks' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "getBanks", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('verify-account'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify bank account number' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_account_dto_1.VerifyAccountDto]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "verifyAccount", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('verify/:reference'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify a deposit transaction status from Paystack' }),
    __param(0, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "verify", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('transfer'),
    (0, audit_decorator_1.AuditLog)('WALLET_WITHDRAWAL', 'WALLET'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a withdrawal (transfer)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initiate_transfer_dto_1.InitiateTransferDto]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "initiateTransfer", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Post)('refund'),
    (0, audit_decorator_1.AuditLog)('PAYMENT_REFUND', 'WALLET'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a refund (admin only)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initiate_refund_dto_1.InitiateRefundDto]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "initiateRefund", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Paystack Webhook' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-paystack-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PaystackController.prototype, "handleWebhook", null);
exports.PaystackController = PaystackController = PaystackController_1 = __decorate([
    (0, swagger_1.ApiTags)('Paystack Payment'),
    (0, common_1.Controller)('paystack'),
    __metadata("design:paramtypes", [paystack_service_1.PaystackService,
        wallet_service_1.WalletService])
], PaystackController);
//# sourceMappingURL=paystack.controller.js.map