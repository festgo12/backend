import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const STABLECOIN_CONTRACTS_MAINNET: Record<string, string> = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export const STABLECOIN_CONTRACTS_TESTNET: Record<string, string> = {
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // USDT on Sepolia
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
};

export type CryptoProvider = 'alchemy';
export type ChainKind = 'EVM' | 'BTC';

/**
 * Central configuration for the local-first crypto architecture.
 * Resolves provider mode, network, HD master seeds/xpubs and per-chain
 * confirmation thresholds from environment variables. CRYPTO_PROVIDER is
 * pinned to 'alchemy'; master seeds come from the HD_* keys.
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
  }

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

  get alchemyEthWsUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_ETH_WS_URL') || null;
  }

  get alchemyEthHttpUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_ETH_HTTP_URL') || null;
  }

  get alchemyBtcHttpUrl(): string | null {
    return this.configService.get<string>('ALCHEMY_BTC_HTTP_URL') || null;
  }

  get mempoolApiUrl(): string {
    return (
      this.configService.get<string>(
        'MEMPOOL_API_URL',
        'https://mempool.space/api',
      ) || 'https://mempool.space/api'
    );
  }

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

  get depositSweepThreshold(): number {
    return Number(
      this.configService.get<string>('DEPOSIT_SWEEP_THRESHOLD', '0'),
    );
  }

  /**
   * Resolves the ERC-20 contract for a stablecoin. An explicit env override
   * (`ALCHEMY_<CURRENCY>_CONTRACT`) always wins; otherwise the
   * network-appropriate default is returned. Returns null when no contract is
   * configured for the active network.
   */
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
