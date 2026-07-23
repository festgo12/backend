import { PrismaService } from '../../core/database/prisma.service';
import { AlertEngineService } from './alert-engine.service';
export interface FraudRuleConfig {
    code: string;
    name: string;
    description: string;
    threshold: number;
    severity: string;
    action: string;
}
export declare class FraudRulesService {
    private prisma;
    private alertEngine;
    private readonly logger;
    constructor(prisma: PrismaService, alertEngine: AlertEngineService);
    onModuleInit(): Promise<void>;
    private seedDefaultRules;
    getAllRules(): Promise<{
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
    updateRule(ruleId: string, data: {
        enabled?: boolean;
        threshold?: number;
        severity?: string;
        action?: string;
    }): Promise<{
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
    getRuleByCode(code: string): Promise<{
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
    evaluateMultipleAccountsSameDevice(userId: string, deviceId: string): Promise<void>;
    evaluateRapidWithdrawals(userId: string): Promise<void>;
    evaluateUnusualVolume(userId: string): Promise<void>;
    evaluateNewDeviceLogin(userId: string, deviceId: string, ipAddress: string): Promise<void>;
    evaluateFailedLoginBurst(email: string, ipAddress: string): Promise<void>;
}
