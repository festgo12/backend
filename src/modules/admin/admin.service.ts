import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    // Explicitly typing this as Prisma.UserWhereInput ensures complete type safety
    const where: any = search
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

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    console.log(user);
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
        securityLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
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
        snapshots: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
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
}
