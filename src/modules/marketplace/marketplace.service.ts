import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
import { AdType, Currency } from '@src/generated/client';
import { Decimal } from '@src/generated/client/runtime/library';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async createAd(userId: string, dto: CreateAdDto) {
    if (dto.type === AdType.SELL) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: dto.asset } },
      });

      const available = wallet?.balance?.toString() || '0';
      if (!wallet || wallet.balance.lessThan(dto.quantity)) {
        throw new BadRequestException(
          `Insufficient ${dto.asset} balance. You need ${dto.quantity} ${dto.asset} but have ${available}.`,
        );
      }
    }

    if (dto.type === AdType.BUY) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: 'NGN' } },
      });

      const requiredNgn = new Decimal(dto.quantity.toString()).times(dto.price.toString());
      const available = wallet?.balance?.toString() || '0';
      if (!wallet || wallet.balance.lessThan(requiredNgn)) {
        throw new BadRequestException(
          `Insufficient NGN balance. You need ₦${requiredNgn.toFixed(2)} but have ₦${available}.`,
        );
      }
    }

    return this.prisma.ad.create({
      data: {
        sellerId: userId,
        asset: dto.asset,
        type: dto.type,
        price: dto.price,
        quantity: dto.quantity,
        minLimit: dto.minLimit,
        maxLimit: dto.maxLimit,
        isSponsored: dto.isSponsored || false,
        status: 'ACTIVE',
      },
    });
  }

  async updateAd(userId: string, adId: string, dto: UpdateAdDto) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });

    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.sellerId !== userId) throw new BadRequestException('Unauthorized');

    return this.prisma.ad.update({
      where: { id: adId },
      data: {
        ...dto,
      },
    });
  }

  async deleteAd(userId: string, adId: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });

    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.sellerId !== userId) throw new BadRequestException('Unauthorized');

    return this.prisma.ad.delete({ where: { id: adId } });
  }

  async listUserAds(userId: string) {
    return this.prisma.ad.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSellerStats(sellerId: string) {
    const [totalOrders, completedOrders] = await Promise.all([
      this.prisma.order.count({ where: { sellerId } }),
      this.prisma.order.count({ where: { sellerId, status: 'COMPLETED' } }),
    ]);
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    return { totalOrders, completedOrders, completionRate };
  }

  private async getSellerStatsBatch(sellerIds: string[]): Promise<Map<string, { totalOrders: number; completionRate: number }>> {
    if (sellerIds.length === 0) return new Map();

    const results = await this.prisma.order.groupBy({
      by: ['sellerId'],
      where: { sellerId: { in: sellerIds } },
      _count: { id: true },
    });

    const completedCounts = await this.prisma.order.groupBy({
      by: ['sellerId'],
      where: { sellerId: { in: sellerIds }, status: 'COMPLETED' },
      _count: { id: true },
    });

    const completedMap = new Map(completedCounts.map((r) => [r.sellerId, r._count.id]));

    const map = new Map<string, { totalOrders: number; completionRate: number }>();
    for (const r of results) {
      const total = r._count.id;
      const completed = completedMap.get(r.sellerId) || 0;
      map.set(r.sellerId, {
        totalOrders: total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
    return map;
  }

  async searchAds(dto: SearchAdsDto) {
    const { asset, type, minPrice, maxPrice, isSponsored, sortBy, sortOrder } = dto;
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
    };

    if (asset) where.asset = asset;
    if (type) where.type = type;
    if (isSponsored !== undefined) where.isSponsored = isSponsored;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    if (dto.search) {
      where.OR = [
        { seller: { email: { contains: dto.search, mode: 'insensitive' } } },
        { seller: { profile: { firstName: { contains: dto.search, mode: 'insensitive' } } } },
        { seller: { profile: { lastName: { contains: dto.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.ad.count({ where }),
      this.prisma.ad.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isSponsored: 'desc' },
          { [sortBy || 'createdAt']: sortOrder || 'desc' },
        ],
        include: {
          seller: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  kycStatus: true,
                },
              },
              devices: {
                select: { lastLogin: true },
                take: 1,
                orderBy: { lastLogin: 'desc' },
              },
            },
          },
        },
      }),
    ]);

    const sellerIds = [...new Set(items.map((i) => i.sellerId))];
    const statsMap = await this.getSellerStatsBatch(sellerIds);

    const enrichedItems = items.map((item) => {
      const stats = statsMap.get(item.sellerId) || { totalOrders: 0, completionRate: 0 };
      return {
        ...item,
        seller: {
          ...item.seller,
          totalOrders: stats.totalOrders,
          completionRate: stats.completionRate,
        },
      };
    });

    const sponsored = enrichedItems.filter((i) => i.isSponsored);
    const nonSponsored = enrichedItems.filter((i) => !i.isSponsored);
    for (let i = nonSponsored.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonSponsored[i], nonSponsored[j]] = [nonSponsored[j], nonSponsored[i]];
    }

    return {
      items: [...sponsored, ...nonSponsored],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
