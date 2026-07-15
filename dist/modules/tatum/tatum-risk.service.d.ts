import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { RiskEngineService } from '../security/risk-engine.service';
import { FraudRulesService } from '../security/fraud-rules.service';
import { AlertEngineService } from '../security/alert-engine.service';
export declare class TatumRiskService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly riskEngine;
    private readonly fraudRules;
    private readonly alertEngine;
    private readonly logger;
    private readonly KNOWN_EXCHANGE_PATTERNS;
    private readonly AMOUNT_THRESHOLDS;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, riskEngine: RiskEngineService, fraudRules: FraudRulesService, alertEngine: AlertEngineService);
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
    screenDeposit(params: {
        walletId: string;
        amount: number;
        sourceAddress: string;
        currency: string;
    }): Promise<{
        safe: boolean;
        riskScore: number;
        reasons: string[];
    }>;
    private isSanctioned;
    private isValidAddressFormat;
}
