import { PrismaService } from '../../core/database/prisma.service';
export declare class RiskEngineService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    calculateUserRiskScore(userId: string): Promise<{
        score: number;
        level: string;
        signals: Record<string, number>;
    }>;
    getAdminRiskOverview(): Promise<{
        users: {
            total: number;
            frozen: number;
            suspended: number;
            with2FA: number;
            twoFaRate: number;
        };
        threats: {
            failedLogins24h: number;
            fraudFlaggedOrders7d: number;
            disputes7d: number;
        };
        alerts: {
            bySeverity: {
                severity: string;
                count: number;
            }[];
        };
    }>;
}
