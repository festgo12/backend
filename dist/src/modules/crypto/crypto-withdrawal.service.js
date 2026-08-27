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
var CryptoWithdrawalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoWithdrawalService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const chain_client_service_1 = require("./chain-client.service");
const withdrawal_tracker_service_1 = require("./withdrawal-tracker.service");
const hd_wallet_service_1 = require("./hd-wallet.service");
const platform_service_1 = require("./platform.service");
const client_1 = require("../../generated/client/index.js");
let CryptoWithdrawalService = CryptoWithdrawalService_1 = class CryptoWithdrawalService {
    prisma;
    hdWallet;
    chainClient;
    tracker;
    platformService;
    cryptoConfig;
    eventEmitter;
    logger = new common_1.Logger(CryptoWithdrawalService_1.name);
    constructor(prisma, hdWallet, chainClient, tracker, platformService, cryptoConfig, eventEmitter) {
        this.prisma = prisma;
        this.hdWallet = hdWallet;
        this.chainClient = chainClient;
        this.tracker = tracker;
        this.platformService = platformService;
        this.cryptoConfig = cryptoConfig;
        this.eventEmitter = eventEmitter;
    }
    async processWithdrawal(params) {
        const { walletId, amount, destinationAddress, currency } = params;
        this.logger.log(`Initiating local withdrawal: ${amount} ${currency} to ${destinationAddress}`);
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
            select: { id: true, isFrozen: true, currency: true },
        });
        if (!wallet)
            throw new common_1.BadRequestException('Wallet not found');
        if (wallet.isFrozen) {
            throw new common_1.BadRequestException('Wallet is frozen due to rollback detection. Please contact support.');
        }
        if (!wallet.currency || !this.hdWallet.chainForCurrency(wallet.currency)) {
            throw new common_1.BadRequestException('Wallet has no on-chain address yet. Please request a deposit address first.');
        }
        this.validateAddress(currency, destinationAddress);
        const amountDecimal = new client_1.Prisma.Decimal(amount);
        const reserveResult = await this.prisma.$executeRaw `
      UPDATE "Wallet"
      SET "reservedBalance" = "reservedBalance" + ${amountDecimal}
      WHERE "id" = ${walletId}::uuid
        AND ("balance" - "reservedBalance") >= ${amountDecimal}
    `;
        if (reserveResult === 0) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        await this.prisma.walletTransaction.create({
            data: {
                walletId,
                type: client_1.LedgerType.WITHDRAWAL,
                amount,
                status: 'PENDING',
                reference: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                metadata: {
                    destination: destinationAddress,
                    blockchain: this.hdWallet.chainForCurrency(currency),
                    provider: 'alchemy',
                    intent: true,
                },
            },
        });
        const fromIndex = 0;
        let txHash;
        try {
            if (currency === client_1.Currency.BTC) {
                const feePerByte = await this.chainClient.getBtcRecommendedFee();
                txHash = await this.chainClient.broadcastBtc(fromIndex, destinationAddress, amount, feePerByte);
            }
            else if (currency === client_1.Currency.ETH) {
                txHash = await this.chainClient.broadcastEvmNative(fromIndex, destinationAddress, amount);
            }
            else if (currency === client_1.Currency.USDT || currency === client_1.Currency.USDC) {
                txHash = await this.chainClient.broadcastEvmToken(currency, fromIndex, destinationAddress, amount);
            }
            else {
                throw new common_1.BadRequestException(`Withdrawals not supported for ${currency}`);
            }
        }
        catch (error) {
            const err = error;
            const message = err.response?.data?.message || err.message;
            this.logger.error(`Blockchain submission failed for ${currency}: ${message}`);
            await this.prisma.$executeRaw `
        UPDATE "Wallet"
        SET "reservedBalance" = "reservedBalance" - ${amountDecimal}
        WHERE "id" = ${walletId}::uuid
      `;
            throw new common_1.InternalServerErrorException(`Withdrawal failed: ${message}`);
        }
        await this.prisma.walletTransaction.updateMany({
            where: {
                walletId,
                status: 'PENDING',
                reference: { startsWith: 'intent-' },
            },
            data: {
                reference: txHash,
                metadata: {
                    destination: destinationAddress,
                    blockchain: this.hdWallet.chainForCurrency(currency),
                    provider: 'alchemy',
                    initiatedAt: new Date().toISOString(),
                },
            },
        });
        await this.tracker.enqueue({
            txHash,
            walletId,
            currency,
            amount,
            destination: destinationAddress,
            metadata: { source: 'USER_WITHDRAWAL' },
        });
        this.eventEmitter.emit('wallet.withdrawal.initiated', {
            transactionId: txHash,
            walletId,
            type: client_1.LedgerType.WITHDRAWAL,
            reference: txHash,
            amount,
            status: 'PENDING',
        });
        this.logger.log(`Local withdrawal submitted: ${txHash} (${amount} ${currency})`);
        return { txId: txHash, status: 'PENDING' };
    }
    async retryWithdrawal(transactionId) {
        const tx = await this.prisma.walletTransaction.findUnique({
            where: { id: transactionId },
            include: { wallet: true },
        });
        if (!tx || tx.status !== 'FAILED') {
            throw new common_1.BadRequestException('Transaction not found or not in FAILED status');
        }
        const meta = (tx.metadata ?? {});
        await this.prisma.walletTransaction.update({
            where: { id: transactionId },
            data: { status: 'CANCELLED' },
        });
        return this.processWithdrawal({
            walletId: tx.walletId,
            amount: tx.amount.toNumber(),
            destinationAddress: meta.destination ?? '',
            currency: tx.wallet.currency,
        });
    }
    async sweepFeeWallet(params) {
        const { currency, destinationAddress, amount: requestedAmount } = params;
        this.validateAddress(currency, destinationAddress);
        const feeWallet = await this.platformService.getPlatformFeeWallet(currency);
        if (!feeWallet) {
            throw new common_1.BadRequestException(`Fee wallet not found for ${currency}`);
        }
        if (!feeWallet.address) {
            throw new common_1.BadRequestException(`Fee wallet for ${currency} has no on-chain address`);
        }
        let fromIndex = feeWallet.derivationIndex;
        if (fromIndex === null) {
            const info = currency === client_1.Currency.BTC
                ? {
                    address: this.hdWallet.getMasterAddress('BTC'),
                    derivationIndex: 0,
                    chain: 'BTC',
                }
                : {
                    address: this.hdWallet.getMasterAddress('EVM'),
                    derivationIndex: 0,
                    chain: 'EVM',
                };
            await this.prisma.wallet.update({
                where: { id: feeWallet.id },
                data: {
                    address: info.address,
                    derivationIndex: info.derivationIndex,
                    chain: info.chain,
                },
            });
            fromIndex = info.derivationIndex;
        }
        let amount;
        if (requestedAmount && requestedAmount > 0) {
            amount = requestedAmount;
        }
        else {
            if (currency === client_1.Currency.BTC) {
                const utxos = await this.chainClient.getBtcUtxos(feeWallet.address);
                amount = utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
            }
            else {
                amount = await this.chainClient.getEvmBalance(feeWallet.address, currency);
            }
            if (amount <= 0) {
                throw new common_1.BadRequestException(`No on-chain balance available for ${currency} sweep`);
            }
        }
        let txHash;
        try {
            if (currency === client_1.Currency.BTC) {
                const feePerByte = await this.chainClient.getBtcRecommendedFee();
                txHash = await this.chainClient.broadcastBtc(fromIndex, destinationAddress, amount, feePerByte);
            }
            else if (currency === client_1.Currency.ETH) {
                txHash = await this.chainClient.broadcastEvmNative(fromIndex, destinationAddress, amount);
            }
            else if (currency === client_1.Currency.USDT || currency === client_1.Currency.USDC) {
                txHash = await this.chainClient.broadcastEvmToken(currency, fromIndex, destinationAddress, amount);
            }
            else {
                throw new common_1.BadRequestException(`Withdrawals not supported for ${currency}`);
            }
        }
        catch (error) {
            const err = error;
            const message = err.response?.data?.message || err.message;
            this.logger.error(`Fee sweep failed for ${currency}: ${message}`);
            throw new common_1.InternalServerErrorException(`Fee sweep failed: ${message}`);
        }
        await this.prisma.walletTransaction.create({
            data: {
                walletId: feeWallet.id,
                type: client_1.LedgerType.WITHDRAWAL,
                amount,
                status: 'PENDING',
                reference: txHash,
                metadata: {
                    destination: destinationAddress,
                    blockchain: this.hdWallet.chainForCurrency(currency),
                    provider: 'alchemy',
                    sweep: true,
                    feeWallet: true,
                    initiatedAt: new Date().toISOString(),
                },
            },
        });
        await this.tracker.enqueue({
            txHash,
            walletId: feeWallet.id,
            currency,
            amount,
            destination: destinationAddress,
            metadata: { source: 'FEE_WALLET_SWEEP' },
        });
        this.logger.log(`Fee wallet sweep submitted: ${amount} ${currency} -> ${destinationAddress} (TX: ${txHash})`);
        return { txId: txHash, status: 'PENDING' };
    }
    validateAddress(currency, address) {
        if (!address || typeof address !== 'string') {
            throw new common_1.BadRequestException('Invalid destination address');
        }
        const trimmed = address.trim();
        switch (currency) {
            case client_1.Currency.BTC:
                if (this.cryptoConfig.isTestnet) {
                    if (!(/^(?:m|n)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) ||
                        /^2[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) ||
                        /^tb1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(trimmed))) {
                        throw new common_1.BadRequestException('Invalid Bitcoin address format');
                    }
                }
                else if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(trimmed)) {
                    throw new common_1.BadRequestException('Invalid Bitcoin address format');
                }
                break;
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                    throw new common_1.BadRequestException('Invalid Ethereum address format');
                }
                try {
                    (0, ethers_1.getAddress)(trimmed);
                }
                catch {
                    throw new common_1.BadRequestException('Invalid Ethereum address checksum (EIP-55). Use a properly checksummed address.');
                }
                break;
            default:
                throw new common_1.BadRequestException(`Unsupported withdrawal currency: ${currency}`);
        }
    }
};
exports.CryptoWithdrawalService = CryptoWithdrawalService;
exports.CryptoWithdrawalService = CryptoWithdrawalService = CryptoWithdrawalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hd_wallet_service_1.HdWalletService,
        chain_client_service_1.ChainClientService,
        withdrawal_tracker_service_1.WithdrawalTrackerService,
        platform_service_1.PlatformService,
        crypto_config_service_1.CryptoConfigService,
        event_emitter_1.EventEmitter2])
], CryptoWithdrawalService);
//# sourceMappingURL=crypto-withdrawal.service.js.map