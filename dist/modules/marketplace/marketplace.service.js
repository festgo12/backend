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
exports.MarketplaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
const library_1 = require("../../generated/client/runtime/library");
let MarketplaceService = class MarketplaceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAd(userId, dto) {
        if (dto.type === client_1.AdType.SELL) {
            const wallet = await this.prisma.wallet.findUnique({
                where: { userId_currency: { userId, currency: dto.asset } },
            });
            const available = wallet?.balance?.toString() || '0';
            if (!wallet || wallet.balance.lessThan(dto.quantity)) {
                throw new common_1.BadRequestException(`Insufficient ${dto.asset} balance. You need ${dto.quantity} ${dto.asset} but have ${available}.`);
            }
        }
        if (dto.type === client_1.AdType.BUY) {
            const wallet = await this.prisma.wallet.findUnique({
                where: { userId_currency: { userId, currency: 'NGN' } },
            });
            const requiredNgn = new library_1.Decimal(dto.quantity.toString()).times(dto.price.toString());
            const available = wallet?.balance?.toString() || '0';
            if (!wallet || wallet.balance.lessThan(requiredNgn)) {
                throw new common_1.BadRequestException(`Insufficient NGN balance. You need ₦${requiredNgn.toFixed(2)} but have ₦${available}.`);
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
    async updateAd(userId, adId, dto) {
        const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
        if (!ad)
            throw new common_1.NotFoundException('Ad not found');
        if (ad.sellerId !== userId)
            throw new common_1.BadRequestException('Unauthorized');
        return this.prisma.ad.update({
            where: { id: adId },
            data: {
                ...dto,
            },
        });
    }
    async deleteAd(userId, adId) {
        const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
        if (!ad)
            throw new common_1.NotFoundException('Ad not found');
        if (ad.sellerId !== userId)
            throw new common_1.BadRequestException('Unauthorized');
        return this.prisma.ad.delete({ where: { id: adId } });
    }
    async listUserAds(userId) {
        return this.prisma.ad.findMany({
            where: { sellerId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getSellerStats(sellerId) {
        const [totalOrders, completedOrders] = await Promise.all([
            this.prisma.order.count({ where: { sellerId } }),
            this.prisma.order.count({ where: { sellerId, status: 'COMPLETED' } }),
        ]);
        const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
        return { totalOrders, completedOrders, completionRate };
    }
    async getSellerStatsBatch(sellerIds) {
        if (sellerIds.length === 0)
            return new Map();
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
        const map = new Map();
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
    async searchAds(dto) {
        const { asset, type, minPrice, maxPrice, isSponsored, sortBy, sortOrder } = dto;
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 10;
        const skip = (page - 1) * limit;
        const where = {
            status: 'ACTIVE',
        };
        if (asset)
            where.asset = asset;
        if (type)
            where.type = type;
        if (isSponsored !== undefined)
            where.isSponsored = isSponsored;
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice)
                where.price.gte = minPrice;
            if (maxPrice)
                where.price.lte = maxPrice;
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
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map