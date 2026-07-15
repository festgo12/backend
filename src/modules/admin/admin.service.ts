import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus, Currency, LedgerType } from '@src/generated/client';
import { Prisma } from '@src/generated/client';
import { TatumWithdrawalService } from '../tatum/tatum-withdrawal.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private readonly tatumWithdrawal: TatumWithdrawalService,
    private readonly exchangeRateService: TatumExchangeRateService,
  ) {}

  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { profile: { firstName: { contains: search, mode: 'insensitive' } } },
            { profile: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

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
      ? { user: { OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ] } }
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
        ledgerEntries: { take: 50, orderBy: { createdAt: 'desc' }, include: { transaction: true } },
        snapshots: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getAllTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        skip,
        take: limit,
        include: { wallet: { include: { user: { include: { profile: true } } } } },
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
      ? { OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { buyer: { email: { contains: search, mode: 'insensitive' } } },
            { seller: { email: { contains: search, mode: 'insensitive' } } },
          ] }
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
        include: { wallet: { include: { user: { include: { profile: true } } } } },
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
        include: { wallet: { include: { user: { include: { profile: true } } } } },
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
    if (tx.status !== 'FAILED') throw new BadRequestException('Only failed transactions can be retried');

    return this.tatumWithdrawal.retryWithdrawal(transactionId);
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
      where: { type: 'DEPOSIT', status: 'COMPLETED', wallet: { currency: 'NGN' } },
      _sum: { amount: true },
    });

    const totalWithdrawals = await this.prisma.walletTransaction.aggregate({
      where: { type: 'WITHDRAWAL', status: 'COMPLETED', wallet: { currency: 'NGN' } },
      _sum: { amount: true },
    });

    return {
      totalDeposits: totalDeposits._sum.amount || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
    };
  }

  async getPaymentTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { wallet: { currency: 'NGN' } },
        skip,
        take: limit,
        include: { wallet: { include: { user: { include: { profile: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { wallet: { currency: 'NGN' } } }),
    ]);

    return {
      transactions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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

    if (filters?.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.success !== undefined && filters.success !== '') where.success = filters.success === 'true';
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
          user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
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
      byResource: byResource.map((r) => ({ resource: r.resource || 'UNKNOWN', count: r._count.resource })),
      byAction: byAction.map((a) => ({ action: a.action, count: a._count.action })),
    };
  }

  async getUserAuditTrail(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.securityLog.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
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
}
