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
var OrdersScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../core/database/prisma.service");
const orders_service_1 = require("./orders.service");
const client_1 = require("@prisma/client");
let OrdersScheduler = OrdersScheduler_1 = class OrdersScheduler {
    prisma;
    ordersService;
    logger = new common_1.Logger(OrdersScheduler_1.name);
    constructor(prisma, ordersService) {
        this.prisma = prisma;
        this.ordersService = ordersService;
    }
    async handleOrderExpirations() {
        this.logger.debug('Checking for expired orders...');
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: client_1.OrderStatus.PENDING_SELLER,
                expiresAt: { lt: new Date() },
            },
        });
        if (expiredOrders.length > 0) {
            this.logger.log(`Found ${expiredOrders.length} expired orders. Processing...`);
            for (const order of expiredOrders) {
                try {
                    await this.ordersService.expireOrder(order.id);
                    this.logger.log(`Order ${order.id} marked as EXPIRED by system.`);
                }
                catch (error) {
                    this.logger.error(`Failed to expire order ${order.id}: ${error.message}`);
                }
            }
        }
    }
};
exports.OrdersScheduler = OrdersScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersScheduler.prototype, "handleOrderExpirations", null);
exports.OrdersScheduler = OrdersScheduler = OrdersScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], OrdersScheduler);
//# sourceMappingURL=orders.scheduler.js.map