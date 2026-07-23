import { PrismaService } from '../../core/database/prisma.service';
import { Prisma } from '@src/generated/client';
export declare class SecurityService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getUserDevices(userId: string): Promise<{
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
    removeDevice(userId: string, deviceId: string): Promise<{
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
    removeAllDevices(userId: string, keepCurrentDeviceId?: string): Promise<{
        deletedCount: number;
    }>;
    updateDeviceActivity(userId: string, deviceId: string, metadata: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    getUserSessions(userId: string): Promise<{
        id: string;
        userAgent: string | null;
        ipAddress: string | null;
        lastActivity: Date | null;
        expiresAt: Date;
        createdAt: Date;
        isActive: boolean;
    }[]>;
    revokeSession(userId: string, tokenId: string): Promise<{
        success: boolean;
    }>;
    revokeAllSessions(userId: string, keepCurrentTokenId?: string): Promise<{
        deletedCount: number;
    }>;
    getUserAlerts(userId: string, filters: {
        type?: string;
        severity?: string;
        isRead?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        alerts: {
            type: string;
            title: string;
            id: string;
            createdAt: Date;
            userId: string;
            severity: string;
            message: string;
            metadata: Prisma.JsonValue | null;
            isRead: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAlertAsRead(userId: string, alertId: string): Promise<{
        type: string;
        title: string;
        id: string;
        createdAt: Date;
        userId: string;
        severity: string;
        message: string;
        metadata: Prisma.JsonValue | null;
        isRead: boolean;
    }>;
    markAllAlertsAsRead(userId: string): Promise<{
        updatedCount: number;
    }>;
    getUnreadAlertCount(userId: string): Promise<{
        count: number;
    }>;
    getSecurityScore(userId: string): Promise<{
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
    parseUserAgent(userAgent: string): {
        browser: string;
        osVersion: string;
        deviceName: string;
    };
    getLocationFromIp(ipAddress: string): Promise<string>;
}
