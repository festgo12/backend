"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CryptoWithdrawalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoWithdrawalService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const bs58 = __importStar(require("bs58"));
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
            select: {
                id: true,
                isFrozen: true,
                currency: true,
                chain: true,
                address: true,
            },
        });
        if (!wallet)
            throw new common_1.BadRequestException('Wallet not found');
        if (wallet.isFrozen) {
            throw new common_1.BadRequestException('Wallet is frozen due to rollback detection. Please contact support.');
        }
        const rawChain = wallet.chain || 'ETH';
        const chain = rawChain === 'EVM' ? 'ETH' : rawChain;
        if (!wallet.currency || !this.hdWallet.chainForCurrency(wallet.currency)) {
            throw new common_1.BadRequestException('Wallet has no on-chain address yet. Please request a deposit address first.');
        }
        this.validateAddress(currency, chain, destinationAddress);
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
                    blockchain: chain,
                    provider: 'alchemy',
                    intent: true,
                },
            },
        });
        const fromIndex = 0;
        let txHash;
        try {
            txHash = await this.broadcastByChain(currency, chain, fromIndex, destinationAddress, amount);
        }
        catch (error) {
            const err = error;
            const message = err.response?.data?.message || err.message;
            this.logger.error(`Blockchain submission failed for ${currency}/${chain}: ${message}`);
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
                    blockchain: chain,
                    provider: 'alchemy',
                    initiatedAt: new Date().toISOString(),
                },
            },
        });
        await this.tracker.enqueue({
            txHash,
            walletId,
            currency,
            chain,
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
        const { currency, destinationAddress, amount: requestedAmount, chain: requestedChain, } = params;
        const feeWallet = await this.platformService.getPlatformFeeWallet(currency, requestedChain);
        if (!feeWallet) {
            throw new common_1.BadRequestException(`Fee wallet not found for ${currency}`);
        }
        if (!feeWallet.address) {
            throw new common_1.BadRequestException(`Fee wallet for ${currency} has no on-chain address`);
        }
        const rawChain = requestedChain || feeWallet.chain || 'ETH';
        const chain = rawChain === 'EVM' ? 'ETH' : rawChain;
        this.validateAddress(currency, chain, destinationAddress);
        const evmFamily = this.cryptoConfig.isEvmChain(chain);
        const masterAddress = this.cryptoConfig.isEvmChain(chain)
            ? this.hdWallet.getMasterAddress('EVM')
            : chain === 'BTC'
                ? this.hdWallet.getMasterAddress('BTC')
                : this.hdWallet.getMasterAddressForChain(chain);
        const dest = destinationAddress.trim();
        const sameMaster = evmFamily || chain === 'TRON'
            ? masterAddress.toLowerCase() === dest.toLowerCase()
            : masterAddress === dest;
        if (sameMaster ||
            (evmFamily || chain === 'TRON'
                ? feeWallet.address.toLowerCase() === dest.toLowerCase()
                : feeWallet.address === dest)) {
            throw new common_1.BadRequestException(`Destination cannot be the platform address itself for ${currency}`);
        }
        let fromIndex = feeWallet.derivationIndex;
        if (fromIndex === null) {
            const info = this.platformFeeAddress(chain);
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
            amount = await this.onChainBalance(currency, chain, feeWallet.address);
            if (amount <= 0) {
                throw new common_1.BadRequestException(`No on-chain balance available for ${currency} sweep`);
            }
        }
        let txHash;
        try {
            txHash = await this.broadcastByChain(currency, chain, fromIndex, destinationAddress, amount);
        }
        catch (error) {
            const err = error;
            const message = err.response?.data?.message || err.message;
            this.logger.error(`Fee sweep failed for ${currency}/${chain}: ${message}`);
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
                    blockchain: chain,
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
            chain,
            amount,
            destination: destinationAddress,
            metadata: { source: 'FEE_WALLET_SWEEP' },
        });
        this.logger.log(`Fee wallet sweep submitted: ${amount} ${currency}/${chain} -> ${destinationAddress} (TX: ${txHash})`);
        return { txId: txHash, status: 'PENDING' };
    }
    validateAddress(currency, chain, address) {
        if (!address || typeof address !== 'string') {
            throw new common_1.BadRequestException('Invalid destination address');
        }
        const trimmed = address.trim();
        if (currency === client_1.Currency.BTC) {
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
            return;
        }
        if (chain === 'SOLANA') {
            this.validateSolanaAddress(trimmed);
            return;
        }
        if (chain === 'TRON') {
            this.validateTronAddress(trimmed);
            return;
        }
        if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
            throw new common_1.BadRequestException('Invalid Ethereum address format');
        }
        try {
            (0, ethers_1.getAddress)(trimmed);
        }
        catch {
            throw new common_1.BadRequestException('Invalid Ethereum address checksum (EIP-55). Use a properly checksummed address.');
        }
    }
    validateSolanaAddress(address) {
        if (address.length < 32 || address.length > 44) {
            throw new common_1.BadRequestException('Invalid Solana address length');
        }
        try {
            const decoded = bs58.decode(address);
            if (decoded.length !== 32) {
                throw new common_1.BadRequestException('Invalid Solana address length');
            }
        }
        catch {
            throw new common_1.BadRequestException('Invalid Solana address format');
        }
    }
    validateTronAddress(address) {
        if (!/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(address)) {
            throw new common_1.BadRequestException('Invalid TRON address format');
        }
    }
    async broadcastByChain(currency, chain, fromIndex, to, amount) {
        if (chain === 'EVM')
            chain = 'ETH';
        if (chain === 'BTC') {
            const feePerByte = await this.chainClient.getBtcRecommendedFee();
            return this.chainClient.broadcastBtc(fromIndex, to, amount, feePerByte);
        }
        if (this.cryptoConfig.isEvmChain(chain)) {
            if (currency === client_1.Currency.ETH) {
                return this.chainClient.broadcastEvmNative(fromIndex, to, amount, chain);
            }
            if (currency === client_1.Currency.USDT || currency === client_1.Currency.USDC) {
                return this.chainClient.broadcastEvmToken(currency, fromIndex, to, amount, chain);
            }
            throw new common_1.BadRequestException(`Withdrawals not supported for ${currency} on ${chain}`);
        }
        if (chain === 'SOLANA') {
            if (currency === client_1.Currency.USDT || currency === client_1.Currency.USDC) {
                return this.chainClient.broadcastSolanaToken(currency, fromIndex, to, amount);
            }
            throw new common_1.BadRequestException(`Withdrawals not supported for ${currency} on SOLANA`);
        }
        if (chain === 'TRON') {
            if (currency === client_1.Currency.USDT || currency === client_1.Currency.USDC) {
                return this.chainClient.broadcastTronToken(currency, fromIndex, to, amount);
            }
            throw new common_1.BadRequestException(`Withdrawals not supported for ${currency} on TRON`);
        }
        throw new common_1.BadRequestException(`Withdrawals not supported for ${currency} on ${chain}`);
    }
    async onChainBalance(currency, chain, address) {
        if (chain === 'BTC') {
            const utxos = await this.chainClient.getBtcUtxos(address);
            return utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
        }
        if (this.cryptoConfig.isEvmChain(chain)) {
            if (currency === client_1.Currency.ETH)
                return 0;
            return this.chainClient.getEvmBalance(address, currency, chain);
        }
        if (chain === 'SOLANA') {
            const mint = this.cryptoConfig.getStablecoinContractFor('SOLANA', currency);
            if (!mint)
                return 0;
            return this.chainClient.getSolanaTokenBalance(mint, address);
        }
        if (chain === 'TRON') {
            const contract = this.cryptoConfig.getStablecoinContractFor('TRON', currency);
            if (!contract)
                return 0;
            return this.chainClient.getTronTokenBalance(contract, address);
        }
        return 0;
    }
    platformFeeAddress(chain) {
        if (chain === 'BTC') {
            return { chain: 'BTC', address: this.hdWallet.getMasterAddress('BTC'), derivationIndex: 0 };
        }
        if (chain === 'SOLANA') {
            return { chain: 'SOLANA', address: this.hdWallet.getMasterAddressForChain('SOLANA'), derivationIndex: 0 };
        }
        if (chain === 'TRON') {
            return { chain: 'TRON', address: this.hdWallet.getMasterAddressForChain('TRON'), derivationIndex: 0 };
        }
        return { chain, address: this.hdWallet.getMasterAddress('EVM'), derivationIndex: 0 };
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