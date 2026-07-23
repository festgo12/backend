import { SecurityService } from './security.service';
import { FraudRulesService } from './fraud-rules.service';
import { RiskEngineService } from './risk-engine.service';
import { AlertEngineService } from './alert-engine.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
export declare class SecurityController {
    private readonly securityService;
    private readonly fraudRulesService;
    private readonly riskEngineService;
    private readonly alertEngineService;
    constructor(securityService: SecurityService, fraudRulesService: FraudRulesService, riskEngineService: RiskEngineService, alertEngineService: AlertEngineService);
    getDevices(req: any): Promise<{
        id: string;
        createdAt: Date;
        deviceId: string;
        fingerprint: string;
        deviceName: string | null;
        browser: string | null;
        osVersion: string | null;
        location: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        lastLogin: Date;
        lastActivity: Date | null;
    }[]>;
    removeDevice(req: any, deviceId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        deviceId: string;
        fingerprint: string;
        deviceName: string | null;
        browser: string | null;
        osVersion: string | null;
        location: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        fcmToken: string | null;
        lastLogin: Date;
        lastActivity: Date | null;
    }>;
    removeAllDevices(req: any): Promise<{
        deletedCount: number;
    }>;
    getSessions(req: any): Promise<{
        id: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastActivity: Date | null;
        expiresAt: Date;
        createdAt: Date;
        isActive: boolean;
    }[]>;
    revokeSession(req: any, tokenId: string): Promise<{
        success: boolean;
    }>;
    revokeAllSessions(req: any): Promise<{
        deletedCount: number;
    }>;
    getAlerts(req: any, query: QueryAlertsDto): Promise<{
        alerts: {
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            severity: string;
            title: string;
            message: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            isRead: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAlertRead(req: any, alertId: string): Promise<{
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
    markAllAlertsRead(req: any): Promise<{
        updatedCount: number;
    }>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    getAlertStats(req: any): Promise<{
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
    getSecurityScore(req: any): Promise<{
        score: number;
        level: string;
        factors: {
            twoFactorEnabled: boolean;
            deviceCount: number;
            disputeCount: number;
            fraudFlaggedOrders: number;
            recentFailedLogins: number;
            unreadAlerts: number;
            accountAgeDays: number;
        };
    }>;
    getRiskScore(req: any): Promise<{
        score: number;
        level: string;
        signals: Record<string, number>;
    }>;
}
