import { PrismaService } from '../../core/database/prisma.service';
import { OrdersService } from './orders.service';
export declare class OrdersScheduler {
    private prisma;
    private ordersService;
    private readonly logger;
    constructor(prisma: PrismaService, ordersService: OrdersService);
    handleOrderExpirations(): Promise<void>;
}
