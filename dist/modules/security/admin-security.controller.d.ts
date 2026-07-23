import { FraudRulesService } from './fraud-rules.service';
import { RiskEngineService } from './risk-engine.service';
import { AlertEngineService } from './alert-engine.service';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
export declare class AdminSecurityController {
    private readonly fraudRulesService;
    private readonly riskEngineService;
    private readonly alertEngineService;
    private readonly prisma;
    constructor(fraudRulesService: FraudRulesService, riskEngineService: RiskEngineService, alertEngineService: AlertEngineService, prisma: PrismaService);
    getFraudRules(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        severity: string;
        code: string;
        description: string;
        enabled: boolean;
        threshold: number;
        action: string;
    }[]>;
    updateFraudRule(ruleId: string, dto: UpdateFraudRuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        severity: string;
        code: string;
        description: string;
        enabled: boolean;
        threshold: number;
        action: string;
    } | null>;
    getRiskOverview(): Promise<{
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
    getAllAlerts(page?: string, limit?: string, severity?: string, type?: string, userId?: string): Promise<{
        alerts: ({
            user: {
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
                id: string;
                email: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            severity: string;
            title: string;
            message: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            isRead: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAlertStats(): Promise<{
        total: number;
        unread: number;
        bySeverity: {
            severity: string;
            count: number;
        }[];
        topTypes: {
            type: string;
            count: number;
        }[];
    }>;
    markAlertAsRead(alertId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        severity: string;
        title: string;
        message: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        isRead: boolean;
    }>;
}
