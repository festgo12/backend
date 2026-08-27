"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CryptoRiskService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoRiskService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("../crypto/crypto-config.service");
const risk_engine_service_1 = require("./risk-engine.service");
const fraud_rules_service_1 = require("./fraud-rules.service");
const alert_engine_service_1 = require("./alert-engine.service");
const client_1 = require("../../generated/client/index.js");
const SANCTIONED_ADDRESSES = {
    ethereum: new Set([
        '0x722122df12d4e14e13ac3b6895a86e84145b6967',
        '0xd90e2f925da72a612f2b6293a22bc604b0357acf',
        '0xba214c1c92c61c61c8b81a886c7ea81ca4f97ee5',
        '0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144',
        '0x07687e702b410fa43f4cb4af7fa097918ffd2730',
        '0x8589427373d6d84e98730d7795d8f6f8731fda16',
        '0x7f367cc41522ce07553e823bf3be79a889debe1b',
    ]),
    bitcoin: new Set([
        '1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx',
        'bc1q056v2m0r8qez9d2y9ax93cx6lq6ln5rhf7kvz3',
    ]),
};
const DEFAULT_RISK_CONFIG = {
    addressBlockThreshold: 70,
    addressFlagThreshold: 40,
    withdrawalVelocityLimit: 5,
    dailyCumulativeMultiplier: 3,
    userRiskBlockLevel: 25,
};
let CryptoRiskService = CryptoRiskService_1 = class CryptoRiskService {
    prisma;
    cryptoConfig;
    riskEngine;
    fraudRules;
    alertEngine;
    logger = new common_1.Logger(CryptoRiskService_1.name);
    KNOWN_EXCHANGE_PATTERNS = {
        bitcoin: [
            /^34xp4vRoCGJym3xR7yCVPFhoCNxv4s2k/,
            /^bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3z/,
            /^1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s/,
        ],
        ethereum: [
            /^0x28C6c06298d514Db089934071355E5743bf21d60$/,
            /^0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549$/,
        ],
    };
    AMOUNT_THRESHOLDS = {
        BTC: 10,
        ETH: 100,
        USDT: 100000,
        USDC: 100000,
    };
    constructor(prisma, cryptoConfig, riskEngine, fraudRules, alertEngine) {
        this.prisma = prisma;
        this.cryptoConfig = cryptoConfig;
        this.riskEngine = riskEngine;
        this.fraudRules = fraudRules;
        this.alertEngine = alertEngine;
    }
    async getRiskConfig() {
        const config = { ...DEFAULT_RISK_CONFIG };
        try {
            const suspiciousAddressRule = await this.fraudRules.getRuleByCode('SUSPICIOUS_WALLET_ADDRESS');
            if (suspiciousAddressRule) {
                config.addressBlockThreshold =
                    suspiciousAddressRule.threshold === 1 ? 70 : 50;
            }
            const rapidWithdrawalRule = await this.fraudRules.getRuleByCode('RAPID_WITHDRAWALS');
            if (rapidWithdrawalRule) {
                config.withdrawalVelocityLimit = rapidWithdrawalRule.threshold || 3;
            }
        }
        catch {
        }
        return config;
    }
    async screenAddress(address, chain, context = 'withdrawal') {
        const reasons = [];
        let riskScore = 0;
        this.logger.log(`Screening address: ${address} on ${chain} (context: ${context})`);
        try {
            if (!this.isValidAddressFormat(address, chain)) {
                return {
                    isSafe: false,
                    riskScore: 100,
                    reasons: ['Invalid address format'],
                };
            }
            if (this.isSanctioned(address, chain)) {
                this.logger.warn(`SANCTIONED ADDRESS detected: ${address} on ${chain}`);
                const wallet = await this.prisma.wallet.findFirst({ where: { address } });
                if (wallet) {
                    await this.alertEngine.createAlert({
                        userId: wallet.userId,
                        type: 'SUSPICIOUS_WALLET_ADDRESS',
                        severity: 'CRITICAL',
                        title: 'Sanctioned address interaction',
                        message: `Address ${address.slice(0, 10)}... is on the OFAC sanctions list.`,
                        metadata: { address, chain, context },
                    });
                    await this.prisma.user.update({
                        where: { id: wallet.userId },
                        data: { status: 'FROZEN' },
                    });
                    this.logger.warn(`User ${wallet.userId} FROZEN: sanctioned address ${address}`);
                }
                return {
                    isSafe: false,
                    riskScore: 100,
                    reasons: ['Address is on OFAC sanctions list'],
                };
            }
            const isExchange = this.KNOWN_EXCHANGE_PATTERNS[chain]?.some((p) => p.test(address));
            if (isExchange) {
                riskScore += 20;
                reasons.push('Address belongs to a known exchange');
            }
            const addressUsers = await this.prisma.wallet.groupBy({
                by: ['userId'],
                where: { address },
            });
            if (addressUsers.length > 1) {
                riskScore += 35;
                reasons.push('Address associated with multiple user accounts');
            }
            const recentFailures = await this.prisma.walletTransaction.count({
                where: {
                    status: 'FAILED',
                    metadata: { path: ['destination'], equals: address },
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            });
            if (recentFailures > 3) {
                riskScore += 25;
                reasons.push(`${recentFailures} failed transactions to this address in 7 days`);
            }
            const flaggedDeposits = await this.prisma.walletTransaction.count({
                where: {
                    status: 'COMPLETED',
                    type: client_1.LedgerType.DEPOSIT,
                    metadata: { path: ['address'], equals: address },
                },
            });
            if (flaggedDeposits > 50) {
                riskScore += 15;
                reasons.push('High volume of deposits from this address');
            }
            const config = await this.getRiskConfig();
            const threshold = context === 'withdrawal'
                ? config.addressBlockThreshold
                : config.addressBlockThreshold + 10;
            const isSafe = riskScore < threshold;
            if (!isSafe) {
                this.logger.warn(`Address ${address} blocked: score=${riskScore}, reasons=${reasons.join('; ')}`);
                const wallet = await this.prisma.wallet.findFirst({
                    where: { address },
                });
                if (wallet) {
                    await this.alertEngine.createAlert({
                        userId: wallet.userId,
                        type: 'SUSPICIOUS_WALLET_ADDRESS',
                        severity: riskScore >= 80 ? 'CRITICAL' : 'HIGH',
                        title: `Suspicious ${context} address detected`,
                        message: `Address ${address.slice(0, 10)}...${address.slice(-6)} flagged: ${reasons.join('; ')}`,
                        metadata: { address, chain, riskScore, reasons, context },
                    });
                    const rule = await this.fraudRules.getRuleByCode('SUSPICIOUS_WALLET_ADDRESS');
                    if (rule && rule.action === 'FREEZE') {
                        await this.prisma.user.update({
                            where: { id: wallet.userId },
                            data: { status: 'FROZEN' },
                        });
                        this.logger.warn(`User ${wallet.userId} FROZEN: suspicious ${context} address`);
                    }
                }
            }
            return { isSafe, riskScore, reasons };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Risk screening failed for ${address}: ${message}`);
            return {
                isSafe: false,
                riskScore: 100,
                reasons: ['Screening service error'],
            };
        }
    }
    async screenTransaction(params) {
        const reasons = [];
        try {
            const userRisk = await this.riskEngine.calculateUserRiskScore(params.userId);
            const config = await this.getRiskConfig();
            if (userRisk.score < config.userRiskBlockLevel) {
                reasons.push(`User risk level too low: ${userRisk.level} (score: ${userRisk.score})`);
            }
            const threshold = this.AMOUNT_THRESHOLDS[params.currency];
            if (threshold && params.amount > threshold) {
                reasons.push(`Amount ${params.amount} ${params.currency} exceeds threshold ${threshold}`);
            }
            await this.fraudRules.evaluateRapidWithdrawals(params.userId);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentWithdrawals = await this.prisma.walletTransaction.count({
                where: {
                    wallet: { userId: params.userId },
                    type: client_1.LedgerType.WITHDRAWAL,
                    createdAt: { gte: oneHourAgo },
                },
            });
            if (recentWithdrawals >= config.withdrawalVelocityLimit) {
                reasons.push(`${recentWithdrawals} withdrawals in the last hour (limit: ${config.withdrawalVelocityLimit})`);
            }
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const dailyAgg = await this.prisma.walletTransaction.aggregate({
                where: {
                    wallet: { userId: params.userId },
                    type: client_1.LedgerType.WITHDRAWAL,
                    status: { in: ['PENDING', 'COMPLETED'] },
                    createdAt: { gte: oneDayAgo },
                },
                _sum: { amount: true },
            });
            const dailyTotal = (dailyAgg._sum.amount?.toNumber() || 0) + params.amount;
            const dailyThreshold = (this.AMOUNT_THRESHOLDS[params.currency] || 1000) *
                config.dailyCumulativeMultiplier;
            if (dailyTotal > dailyThreshold) {
                reasons.push(`24h cumulative withdrawal ${dailyTotal} exceeds limit ${dailyThreshold}`);
            }
            const user = await this.prisma.user.findUnique({
                where: { id: params.userId },
                select: { status: true },
            });
            if (user?.status !== 'ACTIVE') {
                reasons.push(`Account status: ${user?.status}`);
            }
            const criticalAlerts = await this.prisma.securityAlert.count({
                where: {
                    userId: params.userId,
                    severity: { in: ['HIGH', 'CRITICAL'] },
                    isRead: false,
                },
            });
            if (criticalAlerts > 0) {
                reasons.push(`${criticalAlerts} unresolved critical security alerts`);
            }
            const approved = reasons.length === 0;
            if (!approved) {
                this.logger.warn(`Transaction blocked for user ${params.userId}: ${reasons.join('; ')}`);
            }
            return { approved, reasons };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Transaction screening failed: ${message}`);
            return { approved: false, reasons: ['Screening service error'] };
        }
    }
    isSanctioned(address, chain) {
        const sanctioned = SANCTIONED_ADDRESSES[chain];
        if (!sanctioned)
            return false;
        return sanctioned.has(address.toLowerCase()) || sanctioned.has(address);
    }
    isValidAddressFormat(address, chain) {
        if (!address || typeof address !== 'string')
            return false;
        switch (chain) {
            case 'bitcoin':
                if (this.cryptoConfig.isTestnet) {
                    return (/^(?:m|n)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
                        /^2[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
                        /^tb1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(address));
                }
                return /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(address);
            case 'ethereum':
                return /^0x[0-9a-fA-F]{40}$/.test(address);
            default:
                return false;
        }
    }
};
exports.CryptoRiskService = CryptoRiskService;
exports.CryptoRiskService = CryptoRiskService = CryptoRiskService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crypto_config_service_1.CryptoConfigService,
        risk_engine_service_1.RiskEngineService,
        fraud_rules_service_1.FraudRulesService,
        alert_engine_service_1.AlertEngineService])
], CryptoRiskService);
//# sourceMappingURL=crypto-risk.service.js.map