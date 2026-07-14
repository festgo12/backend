import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
import { AdType, Currency } from '@src/generated/client';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) { }

  async createAd(userId: string, dto: CreateAdDto) {
    // 1. If it's a SELL ad, check if user has enough crypto balance
    if (dto.type === AdType.SELL) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: dto.asset } },
      });

      if (!wallet || wallet.balance.lessThan(dto.quantity)) {
        throw new BadRequestException(`Insufficient ${dto.asset} balance to create this ad.`);
      }
    }

    // 2. Create Ad
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

  async searchAds(dto: SearchAdsDto) {
    const { asset, type, minPrice, maxPrice, isSponsored, sortBy, sortOrder } = dto;
    // 👇 FIX: Use nullish coalescing (??) to guarantee they are never undefined
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
          { isSponsored: 'desc' }, // Sponsored always first
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

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
