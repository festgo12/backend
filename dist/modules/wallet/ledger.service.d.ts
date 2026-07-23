import { PrismaService } from '../../core/database/prisma.service';
import { LedgerType, Prisma } from '@src/generated/client';
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
        id: string;
        createdAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        transactionId: string | null;
        orderId: string | null;
        amount: Prisma.Decimal;
        reference: string;
        balanceAfter: Prisma.Decimal;
    }>;
}
