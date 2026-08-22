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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
const crypto_1 = require("crypto");
const crypto_withdrawal_service_1 = require("../crypto/crypto-withdrawal.service");
const exchange_rate_service_1 = require("../crypto/exchange-rate.service");
const crypto_config_service_1 = require("../crypto/crypto-config.service");
const deposit_address_registry_service_1 = require("../crypto/deposit-address-registry.service");
const hd_wallet_service_1 = require("../crypto/hd-wallet.service");
const chain_client_service_1 = require("../crypto/chain-client.service");
const reconciliation_service_1 = require("../crypto/reconciliation.service");
const sweep_service_1 = require("../crypto/sweep.service");
const paystack_service_1 = require("../paystack/paystack.service");
const wallet_service_1 = require("../wallet/wallet.service");
const platform_service_1 = require("../crypto/platform.service");
let AdminService = class AdminService {
    prisma;
    cryptoWithdrawal;
    exchangeRateService;
    cryptoConfig;
    depositRegistry;
    hdWallet;
    chainClient;
    paystackService;
    walletService;
    reconciliationService;
    sweepService;
    constructor(prisma, cryptoWithdrawal, exchangeRateService, cryptoConfig, depositRegistry, hdWallet, chainClient, paystackService, walletService, reconciliationService, sweepService) {
        this.prisma = prisma;
        this.cryptoWithdrawal = cryptoWithdrawal;
        this.exchangeRateService = exchangeRateService;
        this.cryptoConfig = cryptoConfig;
        this.depositRegistry = depositRegistry;
        this.hdWallet = hdWallet;
        this.chainClient = chainClient;
        this.paystackService = paystackService;
        this.walletService = walletService;
        this.reconciliationService = reconciliationService;
        this.sweepService = sweepService;
    }
    async getUsers(page, limit, search) {
        const skip = (page - 1) * limit;
        const where = {
            isSystem: false,
            ...(search
                ? {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search, mode: 'insensitive' } },
                        {
                            profile: {
                                firstName: { contains: search, mode: 'insensitive' },
                            },
                        },
                        {
                            profile: {
                                lastName: { contains: search, mode: 'insensitive' },
                            },
                        },
                    ],
                }
                : {}),
        };
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: { profile: true, wallets: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            users,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async updateUserStatus(userId, status) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id: userId },
            data: { status },
            include: { profile: true },
        });
    }
    async getUserDetail(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                wallets: true,
                devices: true,
                securityLogs: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const { passwordHash, ...result } = user;
        return result;
    }
    async getAllWallets(page, limit, search) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                user: {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search, mode: 'insensitive' } },
                    ],
                },
            }
            : {};
        const [wallets, total] = await Promise.all([
            this.prisma.wallet.findMany({
                where,
                skip,
                take: limit,
                include: { user: { include: { profile: true } } },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.wallet.count({ where }),
        ]);
        return {
            wallets,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getWalletDetail(walletId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
            include: {
                user: { include: { profile: true } },
                ledgerEntries: {
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    include: { transaction: true },
                },
                snapshots: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found');
        return wallet;
    }
    async getFeeWallets() {
        const platformUser = await this.prisma.user.findUnique({
            where: { email: platform_service_1.PLATFORM_EMAIL },
        });
        if (!platformUser) {
            return { wallets: [], total: 0 };
        }
        const wallets = await this.prisma.wallet.findMany({
            where: { userId: platformUser.id },
            include: {
                _count: { select: { ledgerEntries: true } },
            },
            orderBy: { currency: 'asc' },
        });
        return {
            wallets: wallets.map((w) => ({
                id: w.id,
                currency: w.currency,
                address: w.address,
                balance: w.balance.toNumber(),
                reservedBalance: w.reservedBalance.toNumber(),
                available: w.balance.minus(w.reservedBalance).toNumber(),
                ledgerEntryCount: w._count.ledgerEntries,
                updatedAt: w.updatedAt,
            })),
            total: wallets.length,
        };
    }
    async sweepFeeWallet(currency, address, amount) {
        if (!address || typeof address !== 'string') {
            throw new common_1.BadRequestException('Treasury destination address is required');
        }
        if (currency === 'NGN') {
            throw new common_1.BadRequestException('NGN fee revenue is held in the ledger, not on-chain');
        }
        return this.cryptoWithdrawal.sweepFeeWallet({
            currency,
            destinationAddress: address,
            amount,
        });
    }
    async creditTestFunds(email, currency, amount) {
        if (!this.cryptoConfig.isTestnet) {
            throw new common_1.ForbiddenException('Testnet credit is disabled on a mainnet environment');
        }
        if (!email) {
            throw new common_1.BadRequestException('User email is required');
        }
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('Amount must be a positive number');
        }
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException(`No user found with email ${email}`);
        }
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId_currency: { userId: user.id, currency } },
        });
        if (!wallet) {
            throw new common_1.NotFoundException(`No ${currency} wallet for ${email} — create one first`);
        }
        return this.walletService.createTransaction({
            walletId: wallet.id,
            type: client_1.LedgerType.DEPOSIT,
            amount,
            reference: `testnet-credit-${(0, crypto_1.randomUUID)()}`,
            status: 'COMPLETED',
            metadata: { testnet: true, source: 'admin' },
        });
    }
    async getAllTransactions(page, limit) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count(),
        ]);
        return {
            transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getAllOrders(page, limit, search) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                OR: [
                    { id: { contains: search, mode: 'insensitive' } },
                    { buyer: { email: { contains: search, mode: 'insensitive' } } },
                    { seller: { email: { contains: search, mode: 'insensitive' } } },
                ],
            }
            : {};
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                include: {
                    buyer: { include: { profile: true } },
                    seller: { include: { profile: true } },
                    ad: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getOrderDetail(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { include: { profile: true, wallets: true } },
                seller: { include: { profile: true, wallets: true } },
                ad: true,
                ledgerEntries: { include: { wallet: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async getBlockchainTransactions(page, limit) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where: { wallet: { currency: { in: ['BTC', 'ETH', 'USDT', 'USDC'] } } },
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count({
                where: { wallet: { currency: { in: ['BTC', 'ETH', 'USDT', 'USDC'] } } },
            }),
        ]);
        return {
            transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getFailedTransactions(page, limit) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where: { status: 'FAILED' },
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count({ where: { status: 'FAILED' } }),
        ]);
        return {
            transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async retryFailedTransaction(transactionId) {
        const tx = await this.prisma.walletTransaction.findUnique({
            where: { id: transactionId },
            include: { wallet: true },
        });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        if (tx.status !== 'FAILED')
            throw new common_1.BadRequestException('Only failed transactions can be retried');
        return this.cryptoWithdrawal.retryWithdrawal(transactionId);
    }
    async getBlockchainStats() {
        const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC'];
        const balanceAgg = await this.prisma.wallet.aggregate({
            where: { currency: { in: cryptoCurrencies } },
            _sum: { balance: true },
        });
        const balances = await this.prisma.wallet.groupBy({
            by: ['currency'],
            where: { currency: { in: cryptoCurrencies } },
            _sum: { balance: true },
            _count: { id: true },
        });
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const txCount24h = await this.prisma.walletTransaction.count({
            where: {
                wallet: { currency: { in: cryptoCurrencies } },
                createdAt: { gte: last24h },
            },
        });
        const pendingCount = await this.prisma.walletTransaction.count({
            where: {
                wallet: { currency: { in: cryptoCurrencies } },
                status: 'PENDING',
            },
        });
        const failedCount = await this.prisma.walletTransaction.count({
            where: {
                wallet: { currency: { in: cryptoCurrencies } },
                status: 'FAILED',
            },
        });
        const completedCount = await this.prisma.walletTransaction.count({
            where: {
                wallet: { currency: { in: cryptoCurrencies } },
                status: 'COMPLETED',
                createdAt: { gte: last24h },
            },
        });
        const total24h = txCount24h || 1;
        const successRate = Math.round((completedCount / total24h) * 100);
        const rates = this.exchangeRateService.getAllRates();
        return {
            balances: balances.map((b) => ({
                currency: b.currency,
                total: b._sum.balance?.toNumber() || 0,
                walletCount: b._count.id,
                rate: rates[b.currency] || 0,
                valueInNgn: (b._sum.balance?.toNumber() || 0) * (rates[b.currency] || 0),
            })),
            totalBalanceNgn: balanceAgg._sum.balance?.toNumber() || 0,
            txCount24h,
            pendingCount,
            failedCount,
            successRate,
            exchangeRates: rates,
        };
    }
    async getPaymentStats() {
        const totalDeposits = await this.prisma.walletTransaction.aggregate({
            where: {
                type: 'DEPOSIT',
                status: 'COMPLETED',
                wallet: { currency: 'NGN' },
            },
            _sum: { amount: true },
        });
        const totalWithdrawals = await this.prisma.walletTransaction.aggregate({
            where: {
                type: 'WITHDRAWAL',
                status: 'COMPLETED',
                wallet: { currency: 'NGN' },
            },
            _sum: { amount: true },
        });
        return {
            totalDeposits: totalDeposits._sum.amount || 0,
            totalWithdrawals: totalWithdrawals._sum.amount || 0,
        };
    }
    async getPaymentTransactions(page, limit, filters) {
        const skip = (page - 1) * limit;
        const where = { wallet: { currency: 'NGN' } };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.type)
            where.type = filters.type;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate)
                where.createdAt.lte = new Date(filters.endDate);
        }
        if (filters?.search) {
            where.OR = [
                { reference: { contains: filters.search, mode: 'insensitive' } },
                {
                    wallet: {
                        user: { email: { contains: filters.search, mode: 'insensitive' } },
                    },
                },
                {
                    wallet: {
                        user: {
                            profile: {
                                firstName: { contains: filters.search, mode: 'insensitive' },
                            },
                        },
                    },
                },
                {
                    wallet: {
                        user: {
                            profile: {
                                lastName: { contains: filters.search, mode: 'insensitive' },
                            },
                        },
                    },
                },
            ];
        }
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where,
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count({ where }),
        ]);
        return {
            transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getPaymentTransactionDetail(transactionId) {
        const transaction = await this.prisma.walletTransaction.findUnique({
            where: { id: transactionId },
            include: {
                wallet: {
                    include: {
                        user: {
                            include: { profile: true },
                        },
                    },
                },
                ledgerEntries: true,
            },
        });
        if (!transaction)
            throw new common_1.NotFoundException('Transaction not found');
        return transaction;
    }
    async getAuditLogs(page, limit, filters) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.action)
            where.action = { contains: filters.action, mode: 'insensitive' };
        if (filters?.resource)
            where.resource = filters.resource;
        if (filters?.userId)
            where.userId = filters.userId;
        if (filters?.success !== undefined && filters.success !== '')
            where.success = filters.success === 'true';
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate)
                where.createdAt.lte = new Date(filters.endDate);
        }
        if (filters?.search) {
            where.OR = [
                { action: { contains: filters.search, mode: 'insensitive' } },
                { resource: { contains: filters.search, mode: 'insensitive' } },
                { user: { email: { contains: filters.search, mode: 'insensitive' } } },
                { ipAddress: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [logs, total] = await Promise.all([
            this.prisma.securityLog.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.securityLog.count({ where }),
        ]);
        return {
            logs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getAuditStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [total, last24hCount, failures, byResource] = await Promise.all([
            this.prisma.securityLog.count(),
            this.prisma.securityLog.count({ where: { createdAt: { gte: last24h } } }),
            this.prisma.securityLog.count({ where: { success: false } }),
            this.prisma.securityLog.groupBy({
                by: ['resource'],
                _count: { resource: true },
                where: { createdAt: { gte: last7d } },
                orderBy: { _count: { resource: 'desc' } },
            }),
        ]);
        const byAction = await this.prisma.securityLog.groupBy({
            by: ['action'],
            _count: { action: true },
            where: { createdAt: { gte: last7d } },
            orderBy: { _count: { action: 'desc' } },
            take: 10,
        });
        return {
            total,
            last24h: last24hCount,
            failures,
            last7d,
            byResource: byResource.map((r) => ({
                resource: r.resource || 'UNKNOWN',
                count: r._count.resource,
            })),
            byAction: byAction.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
        };
    }
    async getFeeConfigs() {
        const configs = await this.prisma.platformFeeConfig.findMany({
            orderBy: { key: 'asc' },
        });
        if (configs.length === 0) {
            const defaults = [
                {
                    key: 'trade_buy_fee_percent',
                    value: 0.5,
                    label: 'Trade Fee (Buy Side) %',
                },
                {
                    key: 'trade_sell_fee_percent',
                    value: 0.5,
                    label: 'Trade Fee (Sell Side) %',
                },
                {
                    key: 'trade_sponsored_fee_percent',
                    value: 0.5,
                    label: 'Sponsored Ad Fee %',
                },
            ];
            await this.prisma.platformFeeConfig.createMany({ data: defaults });
            return this.prisma.platformFeeConfig.findMany({
                orderBy: { key: 'asc' },
            });
        }
        return configs;
    }
    async updateFeeConfig(key, value) {
        if (value < 0 || value > 10) {
            throw new common_1.BadRequestException('Fee percentage must be between 0 and 10');
        }
        const existing = await this.prisma.platformFeeConfig.findUnique({
            where: { key },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Fee config '${key}' not found`);
        return this.prisma.platformFeeConfig.update({
            where: { key },
            data: { value },
        });
    }
    async getFeeValue(key) {
        const config = await this.prisma.platformFeeConfig.findUnique({
            where: { key },
        });
        return config ? Number(config.value) : 0.5;
    }
    async getUserAuditTrail(userId, page, limit) {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            this.prisma.securityLog.findMany({
                where: { userId },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.securityLog.count({ where: { userId } }),
        ]);
        return {
            logs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getCryptoSystemStatus() {
        const recentSweeps = await this.prisma.walletTransaction.findMany({
            where: { metadata: { path: ['sweep'], equals: true } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                amount: true,
                status: true,
                reference: true,
                createdAt: true,
                wallet: { select: { currency: true } },
            },
        });
        return {
            provider: this.cryptoConfig.provider,
            network: this.cryptoConfig.network,
            isTestnet: this.cryptoConfig.isTestnet,
            webhookProviders: {
                evm: 'alchemy',
                btc: 'alchemy',
            },
            confirmations: {
                eth: this.cryptoConfig.evmConfirmations,
                btc: this.cryptoConfig.btcConfirmations,
            },
            depositSweepThreshold: this.cryptoConfig.depositSweepThreshold,
            registrySize: this.depositRegistry.size,
            masterWallets: {
                evm: this.hdWallet.getMasterAddress('EVM'),
                btc: this.hdWallet.getMasterAddress('BTC'),
            },
            recentSweeps,
        };
    }
    async getWithdrawalJobs(page, limit, status) {
        const skip = (page - 1) * limit;
        const where = status ? { status } : {};
        const [jobs, total] = await Promise.all([
            this.prisma.withdrawalJob.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.withdrawalJob.count({ where }),
        ]);
        return {
            jobs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getChainBalances() {
        const evmMaster = this.hdWallet.getMasterAddress('EVM');
        const btcMaster = this.hdWallet.getMasterAddress('BTC');
        const currencies = ['BTC', 'ETH', 'USDT', 'USDC'];
        const balances = await Promise.all(currencies.map(async (currency) => {
            try {
                if (currency === client_1.Currency.BTC) {
                    const utxos = await this.chainClient.getBtcUtxos(btcMaster);
                    return {
                        currency,
                        address: btcMaster,
                        balance: utxos.reduce((sum, u) => sum + u.value, 0) / 1e8,
                    };
                }
                return {
                    currency,
                    address: evmMaster,
                    balance: await this.chainClient.getEvmBalance(evmMaster, currency),
                };
            }
            catch (error) {
                const err = error;
                return {
                    currency,
                    address: currency === client_1.Currency.BTC ? btcMaster : evmMaster,
                    balance: 0,
                    error: err.message || 'Balance query failed',
                };
            }
        }));
        return {
            masterWallets: { evm: evmMaster, btc: btcMaster },
            balances,
        };
    }
    async reconcileAll() {
        return this.reconciliationService.reconcileAll();
    }
    async reconcileCurrency(currency) {
        return this.reconciliationService.reconcileCurrency(currency);
    }
    async triggerSweepAll() {
        await this.sweepService.manualSweepAll();
        return { success: true, message: 'Sweep completed' };
    }
    async getBtcHistory(page, pageSize) {
        const xpub = this.cryptoConfig.btcMasterXpub;
        if (!xpub) {
            throw new common_1.BadRequestException('BTC master xpub not configured');
        }
        const baseUrl = this.cryptoConfig.alchemyBtcHttpUrl;
        if (!baseUrl) {
            throw new common_1.BadRequestException('ALCHEMY_BTC_HTTP_URL not configured');
        }
        const url = `${baseUrl}/api/v2/xpub/${encodeURIComponent(xpub)}?details=txs&pageSize=${pageSize}&page=${page}`;
        const axios = await import('axios');
        const response = await axios.default.get(url, { timeout: 30_000 });
        const data = response.data;
        const txList = (data.txs ?? []);
        const masterBtcAddr = this.hdWallet.getMasterAddress('BTC');
        const txs = txList.map((tx) => ({
            txid: tx.txid,
            amount: parseFloat(tx.value || '0'),
            confirmations: tx.confirmations || 0,
            blockHeight: tx.blockHeight || 0,
            direction: (tx.vout ?? []).some((v) => v.addresses?.includes(masterBtcAddr))
                ? 'INBOUND'
                : 'OUTBOUND',
            fromAddress: tx.vin?.[0]?.addresses?.[0] || '',
            toAddress: tx.vout?.[0]?.addresses?.[0] || '',
        }));
        const references = txs.map((t) => t.txid);
        const dbTransactions = await this.prisma.walletTransaction.findMany({
            where: { reference: { in: references } },
            select: {
                reference: true,
                status: true,
                amount: true,
                wallet: {
                    select: { currency: true, user: { select: { email: true } } },
                },
            },
        });
        const dbMap = new Map(dbTransactions.map((t) => [t.reference, t]));
        const enriched = txs.map((tx) => ({
            ...tx,
            dbMatch: dbMap.has(tx.txid),
            dbTransaction: dbMap.get(tx.txid) || null,
        }));
        return {
            transactions: enriched,
            total: data.page * data.totalPages || enriched.length,
            page,
            pageSize,
            totalPages: data.totalPages || 1,
        };
    }
    async getEvmHistory(address, page) {
        const rpcUrl = this.cryptoConfig.alchemyEthHttpUrl;
        if (!rpcUrl) {
            throw new common_1.BadRequestException('ALCHEMY_ETH_HTTP_URL not configured');
        }
        const axios = await import('axios');
        const params = {
            toAddress: address.toLowerCase(),
            category: ['external', 'internal', 'erc20'],
            fromBlock: '0x0',
            toBlock: 'latest',
            order: 'asc',
            maxCount: '0x3e8',
            withMetadata: true,
        };
        if (page > 1) {
            params.pageKey = String(page);
        }
        const response = await axios.default.post(rpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [params],
        }, { timeout: 30_000 });
        const result = response.data?.result;
        const transfers = result?.transfers ?? [];
        const enriched = await Promise.all(transfers.map(async (tx) => {
            const dbTx = await this.prisma.walletTransaction.findUnique({
                where: { reference: tx.hash },
                select: {
                    reference: true,
                    status: true,
                    amount: true,
                    wallet: {
                        select: { currency: true, user: { select: { email: true } } },
                    },
                },
            });
            return {
                hash: tx.hash,
                amount: parseFloat(String(tx.value || '0')),
                asset: tx.asset,
                category: tx.category,
                from: tx.from,
                to: tx.to,
                blockNum: parseInt(tx.blockNum, 16),
                dbMatch: !!dbTx,
                dbTransaction: dbTx || null,
            };
        }));
        return {
            address,
            transfers: enriched,
            page,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crypto_withdrawal_service_1.CryptoWithdrawalService,
        exchange_rate_service_1.ExchangeRateService,
        crypto_config_service_1.CryptoConfigService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        hd_wallet_service_1.HdWalletService,
        chain_client_service_1.ChainClientService,
        paystack_service_1.PaystackService,
        wallet_service_1.WalletService,
        reconciliation_service_1.ReconciliationService,
        sweep_service_1.SweepService])
], AdminService);
//# sourceMappingURL=admin.service.js.map