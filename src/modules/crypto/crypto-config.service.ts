import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const STABLECOIN_CONTRACTS_MAINNET: Record<string, string> = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export const STABLECOIN_CONTRACTS_TESTNET: Record<string, string> = {
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

export type CryptoProvider = 'alchemy';
export type ChainKind = 'EVM' | 'BTC';

/**
 * Central configuration for the hybrid webhook-based crypto architecture.
 * EVM deposits arrive via Alchemy Address Activity Webhook; BTC deposits
 * arrive via Alchemy WebSocket subscribeAddresses. Both are processed by
 * a unified WebhookProcessorService.
 */
@Injectable()
export class CryptoConfigService implements OnModuleInit {
  private readonly logger = new Logger(CryptoConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const raw = (
      this.configService.get<string>('CRYPTO_PROVIDER', 'alchemy') || 'alchemy'
    ).toLowerCase();
    if (raw !== 'alchemy') {
      this.logger.warn(
        `Unsupported CRYPTO_PROVIDER "${raw}": only "alchemy" is available. Falling back to alchemy.`,
      );
    }
    if (!this.evmMasterMnemonic) {
      this.logger.warn(
        'No EVM master mnemonic configured (HD_EVM_MASTER_MNEMONIC); EVM address/private-key derivation will fail.',
      );
    }
    if (!this.btcMasterMnemonic) {
      this.logger.warn(
        'No BTC master mnemonic configured (HD_BTC_MASTER_MNEMONIC); BTC address/private-key derivation will fail.',
      );
    }
    if (!this.alchemySigningKey) {
      this.logger.warn(
        'ALCHEMY_SIGNING_KEY is not set; Alchemy webhook signature verification will fail.',
      );
    }
  }

  // ─── Provider ──────────────────────────────────────────────────────────────

  get provider(): CryptoProvider {
    return 'alchemy';
  }

  get isAlchemy(): boolean {
    return true;
  }

  get network(): string {
    return (
      this.configService.get<string>('ALCHEMY_NETWORK', 'sepolia') || 'sepolia'
    ).toLowerCase();
  }

  get isTestnet(): boolean {
    return this.network !== 'mainnet';
  }

  // ─── HD Master Seeds ──────────────────────────────────────────────────────

  get evmMasterMnemonic(): string | null {
    return this.configService.get<string>('HD_EVM_MASTER_MNEMONIC') || null;
  }

  get btcMasterMnemonic(): string | null {
    return this.configService.get<string>('HD_BTC_MASTER_MNEMONIC') || null;
  }

  get evmMasterXpub(): string | null {
    return this.configService.get<string>('HD_EVM_MASTER_XPUB') || null;
  }

  get btcMasterXpub(): string | null {
    return this.configService.get<string>('HD_BTC_MASTER_XPUB') || null;
  }

  get evmDerivationPath(): string {
    return (
      this.configService.get<string>(
        'HD_EVM_DERIVATION_PATH',
        "m/44'/60'/0'/0",
      ) || "m/44'/60'/0'/0"
    );
  }

  get btcDerivationPath(): string {
    return (
      this.configService.get<string>(
        'HD_BTC_DERIVATION_PATH',
        "m/84'/0'/0'/0",
      ) || "m/84'/0'/0'/0"
    );
  }

  get evmAccountIndex(): number {
    return Number(this.configService.get<string>('HD_EVM_ACCOUNT', '0'));
  }

  get btcAccountIndex(): number {
    return Number(this.configService.get<string>('HD_BTC_ACCOUNT', '0'));
  }

  // ─── Alchemy (EVM RPC + Webhook) ─────────────────────────────────────────

  get alchemyEthHttpUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_ETH_HTTP_URL') || null;
  }

  /** Per-webhook signing key for verifying X-Alchemy-Signature. */
  get alchemySigningKey(): string | null {
    return this.configService.get<string>('ALCHEMY_SIGNING_KEY') || null;
  }

  /** Auth token for the Alchemy Notify API (create/update webhooks). */
  get alchemyAuthToken(): string | null {
    return this.configService.get<string>('ALCHEMY_AUTH_TOKEN') || null;
  }

  /** The Alchemy webhook ID to manage addresses on. */
  get alchemyWebhookId(): string | null {
    return this.configService.get<string>('ALCHEMY_WEBHOOK_ID') || null;
  }

  // ─── Alchemy Bitcoin (HTTP RPC + WebSocket) ─────────────────────────────

  /** Alchemy Bitcoin JSON-RPC endpoint URL. */
  get alchemyBtcHttpUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_BTC_HTTP_URL') || null;
  }

  /** Alchemy Bitcoin WebSocket URL for subscribeAddresses. */
  get alchemyBtcWsUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_BTC_WS_URL') || null;
  }

  // ─── Confirmation Thresholds ─────────────────────────────────────────────

  get evmConfirmations(): number {
    return Number(
      this.configService.get<string>('BLOCK_CONFIRMATIONS_ETH', '12'),
    );
  }

  get btcConfirmations(): number {
    return Number(
      this.configService.get<string>('BLOCK_CONFIRMATIONS_BTC', '2'),
    );
  }

  // ─── Sweep ────────────────────────────────────────────────────────────────

  get depositSweepThreshold(): number {
    return Number(
      this.configService.get<string>('DEPOSIT_SWEEP_THRESHOLD', '0'),
    );
  }

  // ─── Reconciliation ─────────────────────────────────────────────────────

  get reconciliationCron(): string {
    return (
      this.configService.get<string>('RECONCILIATION_CRON') || '0 */8 * * *'
    );
  }

  // ─── Stablecoin Contracts ────────────────────────────────────────────────

  getStablecoinContract(currency: string): string | null {
    const override = this.configService.get<string>(
      `ALCHEMY_${currency}_CONTRACT`,
    );
    if (override) return override;
    return this.isTestnet
      ? STABLECOIN_CONTRACTS_TESTNET[currency] || null
      : STABLECOIN_CONTRACTS_MAINNET[currency] || null;
  }
}
