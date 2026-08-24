import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus, Currency, LedgerType } from '@src/generated/client';
import { Prisma } from '@src/generated/client';
import { randomUUID } from 'crypto';
import { CryptoWithdrawalService } from '../crypto/crypto-withdrawal.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { CryptoConfigService } from '../crypto/crypto-config.service';
import { DepositAddressRegistry } from '../crypto/deposit-address-registry.service';
import { HdWalletService } from '../crypto/hd-wallet.service';
import { ChainClientService } from '../crypto/chain-client.service';
import { ReconciliationService } from '../crypto/reconciliation.service';
import { SweepService } from '../crypto/sweep.service';
import { PaystackService } from '../paystack/paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { PLATFORM_EMAIL } from '../crypto/platform.service';

interface ErrorLike {
  message?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private readonly cryptoWithdrawal: CryptoWithdrawalService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly cryptoConfig: CryptoConfigService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly hdWallet: HdWalletService,
    private readonly chainClient: ChainClientService,
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
    private readonly reconciliationService: ReconciliationService,
    private readonly sweepService: SweepService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      completedOrders,
      pendingDisputes,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isSystem: false } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.dispute.count({
        where: {
          status: {
            in: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_ADMIN', 'ESCALATED'],
          },
        },
      }),
      this.prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { type: LedgerType.FEE, amount: { gt: 0 } },
      }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.amount || 0);
    const completionRate =
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    return {
      totalUsers,
      totalOrders,
      completedOrders,
      pendingDisputes,
      totalRevenue,
      completionRate,
    };
  }

  // ─── Order Admin Actions ─────────────────────────────────────────────

  async flagOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { fraudFlagged: true },
    });
  }

  async releaseOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.fraudFlagged) {
      throw new BadRequestException('Order is not flagged');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { fraudFlagged: false },
    });
  }

  // ─── Admin Ad Moderation ─────────────────────────────────────────────

  private static readonly ALLOWED_AD_FIELDS = new Set([
    'status',
    'quantity',
    'price',
    'minLimit',
    'maxLimit',
    'paymentMethods',
    'description',
  ]);

  async adminUpdateAd(adId: string, data: Record<string, unknown>) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Ad not found');

    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (AdminService.ALLOWED_AD_FIELDS.has(key)) {
        safeData[key] = value;
      }
    }

    if (Object.keys(safeData).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    return this.prisma.ad.update({
      where: { id: adId },
      data: safeData,
    });
  }

  async adminDeleteAd(adId: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Ad not found');

    return this.prisma.ad.delete({ where: { id: adId } });
  }

  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
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

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: { profile: true },
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallets: true,
        devices: true,
        securityLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...result } = user;
    return result;
  }

  async getAllWallets(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
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

  async getWalletDetail(walletId: string) {
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

    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  /**
   * Returns the internal platform fee wallets (ledger balances per currency).
   * These are the ledger homes for platform fee revenue.
   */
  async getFeeWallets() {
    const platformUser = await this.prisma.user.findUnique({
      where: { email: PLATFORM_EMAIL },
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

  /**
   * Sweeps a platform fee wallet's on-chain balance to a treasury address.
   */
  async sweepFeeWallet(currency: Currency, address: string, amount?: number) {
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Treasury destination address is required');
    }
    if (currency === ('NGN' as Currency)) {
      throw new BadRequestException(
        'NGN fee revenue is held in the ledger, not on-chain',
      );
    }

    return this.cryptoWithdrawal.sweepFeeWallet({
      currency,
      destinationAddress: address,
      amount,
    });
  }

  /**
   * Credits a user's wallet with test funds via the ledger. Only available on
   * testnet (mainnet funds are real money and must never be fabricated).
   */
  async creditTestFunds(email: string, currency: Currency, amount: number) {
    if (!this.cryptoConfig.isTestnet) {
      throw new ForbiddenException(
        'Testnet credit is disabled on a mainnet environment',
      );
    }
    if (!email) {
      throw new BadRequestException('User email is required');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(`No user found with email ${email}`);
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId_currency: { userId: user.id, currency } },
    });
    if (!wallet) {
      throw new NotFoundException(
        `No ${currency} wallet for ${email} — create one first`,
      );
    }

    return this.walletService.createTransaction({
      walletId: wallet.id,
      type: LedgerType.DEPOSIT,
      amount,
      reference: `testnet-credit-${randomUUID()}`,
      status: 'COMPLETED',
      metadata: { testnet: true, source: 'admin' },
    });
  }

  async getAllTransactions(page: number, limit: number) {
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

  async getAllOrders(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
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

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { include: { profile: true, wallets: true } },
        seller: { include: { profile: true, wallets: true } },
        ad: true,
        ledgerEntries: { include: { wallet: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getBlockchainTransactions(page: number, limit: number) {
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

  async getFailedTransactions(page: number, limit: number) {
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

  /**
   * Retries a failed withdrawal transaction.
   */
  async retryFailedTransaction(transactionId: string) {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'FAILED')
      throw new BadRequestException('Only failed transactions can be retried');

    return this.cryptoWithdrawal.retryWithdrawal(transactionId);
  }

  /**
   * Returns high-level blockchain stats for the dashboard.
   */
  async getBlockchainStats() {
    const cryptoCurrencies: Currency[] = ['BTC', 'ETH', 'USDT', 'USDC'];

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

    // Get live exchange rates
    const rates = this.exchangeRateService.getAllRates();

    return {
      balances: balances.map((b) => ({
        currency: b.currency,
        total: b._sum.balance?.toNumber() || 0,
        walletCount: b._count.id,
        rate: rates[b.currency] || 0,
        valueInNgn:
          (b._sum.balance?.toNumber() || 0) * (rates[b.currency] || 0),
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

  async getPaymentTransactions(
    page: number,
    limit: number,
    filters?: {
      search?: string;
      status?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { wallet: { currency: 'NGN' } };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
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

  async getPaymentTransactionDetail(transactionId: string) {
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

    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async getAuditLogs(
    page: number,
    limit: number,
    filters?: {
      action?: string;
      resource?: string;
      userId?: string;
      success?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.action)
      where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.success !== undefined && filters.success !== '')
      where.success = filters.success === 'true';
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
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

  // ─── Fee Configuration ─────────────────────────────────────────────────────

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

  async updateFeeConfig(key: string, value: number) {
    if (value < 0 || value > 10) {
      throw new BadRequestException('Fee percentage must be between 0 and 10');
    }

    const existing = await this.prisma.platformFeeConfig.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException(`Fee config '${key}' not found`);

    return this.prisma.platformFeeConfig.update({
      where: { key },
      data: { value },
    });
  }

  async getFeeValue(key: string): Promise<number> {
    const config = await this.prisma.platformFeeConfig.findUnique({
      where: { key },
    });
    return config ? Number(config.value) : 0.5;
  }

  // ─── User Audit Trail ─────────────────────────────────────────────────────

  async getUserAuditTrail(userId: string, page: number, limit: number) {
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

  // ─── Crypto Monitoring (Phase 6) ─────────────────────────────────────────

  /**
   * Consolidated crypto system status: provider/network config,
   * master wallets, deposit address registry size, webhook providers and
   * recent sweep activity.
   */
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

  /**
   * Lists withdrawal confirmation jobs with pagination and optional status filter.
   */
  async getWithdrawalJobs(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.WithdrawalJobWhereInput = status ? { status } : {};

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

  /**
   * Live on-chain balances of the platform master wallets (ETH/USDT/USDC on
   * the EVM master, BTC on the BTC master).
   */
  async getChainBalances() {
    const evmMaster = this.hdWallet.getMasterAddress('EVM');
    const btcMaster = this.hdWallet.getMasterAddress('BTC');
    const currencies: Currency[] = ['BTC', 'ETH', 'USDT', 'USDC'];

    const balances = await Promise.all(
      currencies.map(async (currency) => {
        try {
          if (currency === Currency.BTC) {
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
        } catch (error) {
          const err = error as ErrorLike;
          return {
            currency,
            address: currency === Currency.BTC ? btcMaster : evmMaster,
            balance: 0,
            error: err.message || 'Balance query failed',
          };
        }
      }),
    );

    return {
      masterWallets: { evm: evmMaster, btc: btcMaster },
      balances,
    };
  }

  // ─── Reconciliation ────────────────────────────────────────────────────

  /** Triggers full reconciliation across all chains. */
  async reconcileAll() {
    return this.reconciliationService.reconcileAll();
  }

  /** Triggers reconciliation for a specific currency. */
  async reconcileCurrency(currency: Currency) {
    return this.reconciliationService.reconcileCurrency(currency);
  }

  // ─── Sweep ─────────────────────────────────────────────────────────────

  async triggerSweepAll() {
    await this.sweepService.manualSweepAll();
    return { success: true, message: 'Sweep completed' };
  }

  // ─── On-Chain History ──────────────────────────────────────────────────

  async getBtcHistory(page: number, pageSize: number) {
    const xpub = this.cryptoConfig.btcMasterXpub;
    if (!xpub) {
      throw new BadRequestException('BTC master xpub not configured');
    }
    const baseUrl = this.cryptoConfig.alchemyBtcHttpUrl;
    if (!baseUrl) {
      throw new BadRequestException('ALCHEMY_BTC_HTTP_URL not configured');
    }

    const url = `${baseUrl}/api/v2/xpub/${encodeURIComponent(xpub)}?details=txs&pageSize=${pageSize}&page=${page}`;

    const axios = await import('axios');
    const response = await axios.default.get(url, { timeout: 30_000 });
    const data = response.data as Record<string, unknown>;
    const txList = (data.txs ?? []) as Array<{
      txid: string;
      value: string;
      confirmations: number;
      blockHeight: number;
      vout: Array<{ addresses?: string[] }>;
      vin: Array<{ addresses?: string[] }>;
    }>;

    const masterBtcAddr = this.hdWallet.getMasterAddress('BTC');
    const txs = txList.map((tx) => ({
      txid: tx.txid,
      amount: parseFloat(tx.value || '0'),
      confirmations: tx.confirmations || 0,
      blockHeight: tx.blockHeight || 0,
      direction: (tx.vout ?? []).some((v) =>
        v.addresses?.includes(masterBtcAddr),
      )
        ? 'INBOUND'
        : 'OUTBOUND',
      fromAddress: tx.vin?.[0]?.addresses?.[0] || '',
      toAddress: tx.vout?.[0]?.addresses?.[0] || '',
    }));

    // Check DB match for each tx
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
      total:
        (data.page as number) * (data.totalPages as number) || enriched.length,
      page,
      pageSize,
      totalPages: (data.totalPages as number) || 1,
    };
  }

  async getEvmHistory(address: string, page: number) {
    const rpcUrl = this.cryptoConfig.alchemyEthHttpUrl;
    if (!rpcUrl) {
      throw new BadRequestException('ALCHEMY_ETH_HTTP_URL not configured');
    }

    const axios = await import('axios');
    const params: Record<string, unknown> = {
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

    const response = await axios.default.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [params],
      },
      { timeout: 30_000 },
    );

    interface AlchemyTransfer {
      hash: string;
      value: number;
      asset: string;
      category: string;
      from: string;
      to: string;
      blockNum: string;
    }
    const result = (response.data as Record<string, unknown>)?.result as
      | { transfers?: AlchemyTransfer[] }
      | undefined;
    const transfers = result?.transfers ?? [];

    const enriched = await Promise.all(
      transfers.map(async (tx) => {
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
      }),
    );

    return {
      address,
      transfers: enriched,
      page,
    };
  }
}
