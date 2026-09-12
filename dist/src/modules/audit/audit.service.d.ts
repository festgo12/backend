import { PrismaService } from '../../core/database/prisma.service';
import { AuditParams } from './audit.types';
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(params: AuditParams): Promise<void>;
}
