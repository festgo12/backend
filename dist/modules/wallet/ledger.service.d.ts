import { PrismaService } from '../../core/database/prisma.service';
import { LedgerType, Prisma } from '@prisma/client';
export declare class LedgerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createEntry(tx: Prisma.TransactionClient, params: {
        walletId: string;
        transactionId?: string;
        orderId?: string;
        amount: number;
        type: LedgerType;
        reference: string;
        metadata?: any;
    }): Promise<{
        type: import(".prisma/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        walletId: string;
        amount: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        transactionId: string | null;
        orderId: string | null;
        balanceAfter: Prisma.Decimal;
    }>;
}
