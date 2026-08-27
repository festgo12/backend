import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from '../crypto/crypto-config.service';
import { RiskEngineService } from './risk-engine.service';
import { FraudRulesService } from './fraud-rules.service';
import { AlertEngineService } from './alert-engine.service';
export declare class CryptoRiskService {
    private readonly prisma;
    private readonly cryptoConfig;
    private readonly riskEngine;
    private readonly fraudRules;
    private readonly alertEngine;
    private readonly logger;
    private readonly KNOWN_EXCHANGE_PATTERNS;
    private readonly AMOUNT_THRESHOLDS;
    constructor(prisma: PrismaService, cryptoConfig: CryptoConfigService, riskEngine: RiskEngineService, fraudRules: FraudRulesService, alertEngine: AlertEngineService);
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
