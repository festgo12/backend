import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { RiskEngineService } from '../security/risk-engine.service';
import { FraudRulesService } from '../security/fraud-rules.service';
import { AlertEngineService } from '../security/alert-engine.service';

/**
 * Sanctioned / high-risk address lists.
 * In production, load from OFAC SDN CSV or a maintained allowlist API.
 * These are well-known mixer/tornado-style addresses and OFAC-sanctioned entities.
 */
const SANCTIONED_ADDRESSES: Record<string, Set<string>> = {
  ethereum: new Set([
    // Tornado Cash (OFAC sanctioned)
    '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    '0xd90e2f925da72a612f2B6293a22BC604b0357ACF',
    '0xba214c1c92C61C61C8B81A886C7Ea81Ca4F97Ee5',
    '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
    '0x07687e702b410Fa43f4cB4Af7FA097918ffD2730',
    // OFAC sanctioned wallets
    '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
    '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
  ]),
  bitcoin: new Set([
    // Hydra Market (OFAC sanctioned)
    '1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx',
    // Blender.io (OFAC sanctioned)
    'bc1q056v2m0r8qez9d2y9ax93cx6lq6ln5rhf7kvz3',
  ]),
};

/**
 * Configurable risk thresholds (overridable via admin FraudRule table).
 * These serve as defaults; the actual thresholds are read from the FraudRule table.
 */
interface RiskConfig {
  /** Maximum risk score (0-100) before blocking an address */
  addressBlockThreshold: number;
  /** Maximum risk score (0-100) before flagging an address */
  addressFlagThreshold: number;
  /** Maximum withdrawals per hour before blocking */
  withdrawalVelocityLimit: number;
  /** Maximum 24h cumulative withdrawal amount multiplier (x single threshold) */
  dailyCumulativeMultiplier: number;
  /** Maximum risk score from user risk engine (safety score < this = block) */
  userRiskBlockLevel: number;
  /** Whether to enable deposit source screening */
  enableDepositScreening: boolean;
}

const DEFAULT_RISK_CONFIG: RiskConfig = {
  addressBlockThreshold: 70,
  addressFlagThreshold: 40,
  withdrawalVelocityLimit: 5,
  dailyCumulativeMultiplier: 3,
  userRiskBlockLevel: 25,
  enableDepositScreening: true,
};

@Injectable()
export class TatumRiskService {
  private readonly logger = new Logger(TatumRiskService.name);

  // Known exchange hot wallet patterns (flag but don't block)
  private readonly KNOWN_EXCHANGE_PATTERNS: Record<string, RegExp[]> = {
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

  // High-risk amount thresholds (in native units) — overridden by FraudRule if configured
  private readonly AMOUNT_THRESHOLDS: Record<string, number> = {
    BTC: 10,
    ETH: 100,
    USDT: 100000,
    USDC: 100000,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly riskEngine: RiskEngineService,
    private readonly fraudRules: FraudRulesService,
    private readonly alertEngine: AlertEngineService,
  ) {}

  /**
   * Loads the current risk configuration, pulling from FraudRule table where available.
   */
  private async getRiskConfig(): Promise<RiskConfig> {
    const config = { ...DEFAULT_RISK_CONFIG };

    try {
      const suspiciousAddressRule = await this.fraudRules.getRuleByCode('SUSPICIOUS_WALLET_ADDRESS');
      if (suspiciousAddressRule) {
        config.addressBlockThreshold = suspiciousAddressRule.threshold === 1 ? 70 : 50;
      }

      const rapidWithdrawalRule = await this.fraudRules.getRuleByCode('RAPID_WITHDRAWALS');
      if (rapidWithdrawalRule) {
        config.withdrawalVelocityLimit = rapidWithdrawalRule.threshold || 3;
      }
    } catch {
      // Use defaults if fraud rules aren't available
    }

    return config;
  }

  /**
   * Screens an address for risk before allowing deposits or withdrawals.
   * Returns a risk score 0-100 (0 = safe, 100 = blocked).
   */
  async screenAddress(
    address: string,
    chain: string,
    context: 'deposit' | 'withdrawal' = 'withdrawal',
  ): Promise<{ isSafe: boolean; riskScore: number; reasons: string[] }> {
    const reasons: string[] = [];
    let riskScore = 0;

    this.logger.log(`Screening address: ${address} on ${chain} (context: ${context})`);

    try {
      // 1. Format validation
      if (!this.isValidAddressFormat(address, chain)) {
        return { isSafe: false, riskScore: 100, reasons: ['Invalid address format'] };
      }

      // 2. Sanctioned address check (OFAC / known bad actors)
      if (this.isSanctioned(address, chain)) {
        this.logger.warn(`SANCTIONED ADDRESS detected: ${address} on ${chain}`);
        return { isSafe: false, riskScore: 100, reasons: ['Address is on OFAC sanctions list'] };
      }

      // 3. Known exchange hot wallet check (flag, don't block)
      const isExchange = this.KNOWN_EXCHANGE_PATTERNS[chain]?.some(p => p.test(address));
      if (isExchange) {
        riskScore += 20;
        reasons.push('Address belongs to a known exchange');
      }

      // 4. Check for address reuse (same address for multiple users)
      const addressUsers = await this.prisma.wallet.groupBy({
        by: ['userId'],
        where: { address },
      });
      if (addressUsers.length > 1) {
        riskScore += 35;
        reasons.push('Address associated with multiple user accounts');
      }

      // 5. Check if address has been flagged in recent failed transactions
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

      // 6. Check if address has been involved in a flagged order
      const flaggedDeposits = await this.prisma.walletTransaction.count({
        where: {
          status: 'COMPLETED',
          type: 'DEPOSIT' as any,
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
        : config.addressBlockThreshold + 10; // More lenient for deposits

      const isSafe = riskScore < threshold;

      if (!isSafe) {
        this.logger.warn(`Address ${address} blocked: score=${riskScore}, reasons=${reasons.join('; ')}`);

        // Create alert if we have a user context from the wallet lookup
        const wallet = await this.prisma.wallet.findFirst({ where: { address } });
        if (wallet) {
          await this.alertEngine.createAlert({
            userId: wallet.userId,
            type: 'SUSPICIOUS_WALLET_ADDRESS',
            severity: riskScore >= 80 ? 'CRITICAL' : 'HIGH',
            title: `Suspicious ${context} address detected`,
            message: `Address ${address.slice(0, 10)}...${address.slice(-6)} flagged: ${reasons.join('; ')}`,
            metadata: { address, chain, riskScore, reasons, context },
          });
        }
      }

      return { isSafe, riskScore, reasons };
    } catch (error: any) {
      this.logger.error(`Risk screening failed for ${address}: ${error.message}`);
      return { isSafe: false, riskScore: 100, reasons: ['Screening service error'] };
    }
  }

  /**
   * Screens a withdrawal transaction before processing.
   * Checks amount, velocity, user risk level, and FraudRules.
   */
  async screenTransaction(params: {
    userId: string;
    currency: string;
    amount: number;
    destinationAddress: string;
  }): Promise<{ approved: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // 1. Check user's overall risk score from the risk engine
      const userRisk = await this.riskEngine.calculateUserRiskScore(params.userId);
      const config = await this.getRiskConfig();

      if (userRisk.score < config.userRiskBlockLevel) {
        reasons.push(`User risk level too low: ${userRisk.level} (score: ${userRisk.score})`);
      }

      // 2. Check amount against thresholds
      const threshold = this.AMOUNT_THRESHOLDS[params.currency];
      if (threshold && params.amount > threshold) {
        reasons.push(`Amount ${params.amount} ${params.currency} exceeds threshold ${threshold}`);
      }

      // 3. Check withdrawal velocity using FraudRulesService
      await this.fraudRules.evaluateRapidWithdrawals(params.userId);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentWithdrawals = await this.prisma.walletTransaction.count({
        where: {
          wallet: { userId: params.userId },
          type: 'WITHDRAWAL' as any,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (recentWithdrawals >= config.withdrawalVelocityLimit) {
        reasons.push(`${recentWithdrawals} withdrawals in the last hour (limit: ${config.withdrawalVelocityLimit})`);
      }

      // 4. Check 24h cumulative withdrawal amount
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyAgg = await this.prisma.walletTransaction.aggregate({
        where: {
          wallet: { userId: params.userId },
          type: 'WITHDRAWAL' as any,
          status: { in: ['PENDING', 'COMPLETED'] },
          createdAt: { gte: oneDayAgo },
        },
        _sum: { amount: true },
      });
      const dailyTotal = (dailyAgg._sum.amount?.toNumber() || 0) + params.amount;
      const dailyThreshold = (this.AMOUNT_THRESHOLDS[params.currency] || 1000) * config.dailyCumulativeMultiplier;
      if (dailyTotal > dailyThreshold) {
        reasons.push(`24h cumulative withdrawal ${dailyTotal} exceeds limit ${dailyThreshold}`);
      }

      // 5. Check if user account is frozen/suspended
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { status: true },
      });
      if (user?.status !== 'ACTIVE') {
        reasons.push(`Account status: ${user?.status}`);
      }

      // 6. Check if user has any HIGH/CRITICAL unread security alerts
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
    } catch (error: any) {
      this.logger.error(`Transaction screening failed: ${error.message}`);
      return { approved: false, reasons: ['Screening service error'] };
    }
  }

  /**
   * Screens an incoming deposit for risk.
   * Called during webhook processing to flag suspicious deposits early.
   */
  async screenDeposit(params: {
    walletId: string;
    amount: number;
    sourceAddress: string;
    currency: string;
  }): Promise<{ safe: boolean; riskScore: number; reasons: string[] }> {
    const config = await this.getRiskConfig();

    if (!config.enableDepositScreening) {
      return { safe: true, riskScore: 0, reasons: [] };
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: params.walletId },
      include: { user: true },
    });

    if (!wallet) {
      return { safe: true, riskScore: 0, reasons: [] };
    }

    // Screen the source address
    const chain = params.currency === 'BTC' ? 'bitcoin' : 'ethereum';
    const addressResult = await this.screenAddress(params.sourceAddress, chain, 'deposit');

    // Also check user risk
    const userRisk = await this.riskEngine.calculateUserRiskScore(wallet.userId);

    const reasons = [
      ...addressResult.reasons,
      ...(userRisk.score < config.userRiskBlockLevel
        ? [`User risk: ${userRisk.level} (${userRisk.score}/100)`]
        : []),
    ];

    const safe = addressResult.isSafe && userRisk.score >= config.userRiskBlockLevel;

    if (!safe) {
      // Flag but don't block — create alert for manual review
      await this.alertEngine.createAlert({
        userId: wallet.userId,
        type: 'SUSPICIOUS_DEPOSIT',
        severity: 'HIGH',
        title: 'Suspicious deposit detected',
        message: `Incoming deposit of ${params.amount} ${params.currency} from ${params.sourceAddress.slice(0, 10)}... flagged for review.`,
        metadata: {
          walletId: params.walletId,
          amount: params.amount,
          sourceAddress: params.sourceAddress,
          riskScore: addressResult.riskScore,
          userRiskScore: userRisk.score,
          reasons,
        },
      });
    }

    return {
      safe,
      riskScore: addressResult.riskScore,
      reasons,
    };
  }

  /**
   * Checks if an address is on the sanctioned list.
   */
  private isSanctioned(address: string, chain: string): boolean {
    const sanctioned = SANCTIONED_ADDRESSES[chain];
    if (!sanctioned) return false;
    return sanctioned.has(address.toLowerCase()) || sanctioned.has(address);
  }

  /**
   * Validates address format per chain.
   */
  private isValidAddressFormat(address: string, chain: string): boolean {
    if (!address || typeof address !== 'string') return false;

    switch (chain) {
      case 'bitcoin':
        return /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(address);
      case 'ethereum':
        return /^0x[0-9a-fA-F]{40}$/.test(address);
      default:
        return false;
    }
  }
}
