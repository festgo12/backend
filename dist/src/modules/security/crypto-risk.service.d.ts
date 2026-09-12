import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from '../crypto/crypto-config.service';
import { RiskEngineService } from './risk-engine.service';
import { FraudRulesService } from './fraud-rules.service';
import { AlertEngineService } from './alert-engine.service';
export declare const DEFAULT_SANCTIONED_ADDRESSES: Record<string, Set<string>>;
export declare class SanctionedAddressRepository {
    private byChain;
    private lastRefreshedAt;
    constructor();
    getLastRefreshedAt(): Date | null;
    getCounts(): Record<string, number>;
    isSanctioned(address: string, chain: string): boolean;
    refreshFromSource(): Promise<RefreshResult>;
    loadChain(chain: string, addresses: string[]): void;
    replaceFrom(source: Record<string, Set<string>>): void;
    private reloadFrom;
    private mergeReport;
}
export interface RefreshResult {
    lastRefreshedAt: Date | null;
    counts: Record<string, number>;
    source: string;
    merged: {
        chainsBefore: Record<string, number>;
        chainsAfter: Record<string, number>;
    };
}
export declare class CryptoRiskService {
    private readonly prisma;
    private readonly cryptoConfig;
    private readonly riskEngine;
    private readonly fraudRules;
    private readonly alertEngine;
    private readonly sanctions;
    private readonly logger;
    private readonly KNOWN_EXCHANGE_PATTERNS;
    private readonly AMOUNT_THRESHOLDS;
    constructor(prisma: PrismaService, cryptoConfig: CryptoConfigService, riskEngine: RiskEngineService, fraudRules: FraudRulesService, alertEngine: AlertEngineService, sanctions: SanctionedAddressRepository);
    private getRiskConfig;
    screenAddress(address: string, chain: string, context?: 'deposit' | 'withdrawal'): Promise<{
        isSafe: boolean;
        riskScore: number;
        reasons: string[];
    }>;
    screenTransaction(params: {
        userId: string;
        currency: string;
        amount: number;
        destinationAddress: string;
    }): Promise<{
        approved: boolean;
        reasons: string[];
    }>;
    private isSanctioned;
    private isValidAddressFormat;
}
