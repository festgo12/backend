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
        type: import("@src/generated/client").$Enums.LedgerType;
        orderId: string | null;
        reference: string;
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        balanceAfter: Prisma.Decimal;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        transactionId: string | null;
    }>;
}
