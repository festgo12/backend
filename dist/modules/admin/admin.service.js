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
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUsers(page, limit, search) {
        const skip = (page - 1) * limit;
        const where = search
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
            : {};
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    profile: true,
                    wallets: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateUserStatus(userId, status) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        console.log(user);
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
                securityLogs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
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
                include: {
                    user: {
                        include: { profile: true },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.wallet.count({ where }),
        ]);
        return {
            wallets,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
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
                snapshots: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found');
        return wallet;
    }
    async getAllTransactions(page, limit) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                skip,
                take: limit,
                include: {
                    wallet: {
                        include: {
                            user: { include: { profile: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count(),
        ]);
        return {
            transactions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
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
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getOrderDetail(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { include: { profile: true, wallets: true } },
                seller: { include: { profile: true, wallets: true } },
                ad: true,
                ledgerEntries: {
                    include: { wallet: true },
                },
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
                where: {
                    wallet: {
                        currency: { in: ['BTC', 'ETH', 'USDT', 'USDC'] },
                    },
                },
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count({
                where: {
                    wallet: {
                        currency: { in: ['BTC', 'ETH', 'USDT', 'USDC'] },
                    },
                },
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
    async getBlockchainStats() {
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
    async getPaymentTransactions(page, limit) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where: {
                    wallet: { currency: 'NGN' },
                },
                skip,
                take: limit,
                include: {
                    wallet: { include: { user: { include: { profile: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count({
                where: {
                    wallet: { currency: 'NGN' },
                },
            }),
        ]);
        return {
            transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getAuditLogs(page, limit, filters) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.action) {
            where.action = { contains: filters.action, mode: 'insensitive' };
        }
        if (filters?.resource) {
            where.resource = filters.resource;
        }
        if (filters?.userId) {
            where.userId = filters.userId;
        }
        if (filters?.success !== undefined && filters.success !== '') {
            where.success = filters.success === 'true';
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
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
            last7d: last7d,
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map