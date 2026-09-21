import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAddress } from 'ethers';

export const STABLECOIN_CONTRACTS_MAINNET: Record<string, string> = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export const STABLECOIN_CONTRACTS_TESTNET: Record<string, string> = {
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

/**
 * Per-chain stablecoin TRC-20/SPL contract addresses (MAINNET). Keyed by
 * chain then token symbol. EVM-family chains resolve via
 * STABLECOIN_CONTRACTS_* plus an optional ALCHEMY_<CHAIN>_<TOKEN>_CONTRACT
 * override.
 */
export const STABLECOIN_CONTRACTS_BY_CHAIN: Record<
  string,
  Record<string, string>
> = {
  // BSC (BEP-20)
  BSC: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  // Polygon PoS (ERC-20)
  POLYGON: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    // Bridged USDC.e — canonical checksummed form (EIP-55).
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  // TRON (TRC-20) — T... smart-contract addresses
  TRON: {
    USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
  },
};

/**
 * Per-chain stablecoin contracts for TESTNET networks (ALCHEMY_NETWORK !=
 * mainnet). Chains without a listed testnet token fall back to the global
 * Sepolia set, which matches the Alchemy testnet endpoints used here
 * (eth-sepolia / bsc-sapolia / polygon-amoy).
 */
export const STABLECOIN_CONTRACTS_BY_CHAIN_TESTNET: Record<
  string,
  Record<string, string>
> = {
  // BSC testnet (BEP-20)
  BSC: {
    USDT: '0x337610d27c682E347C9cD60bD4b3b107C9d34Ddd',
    USDC: '0x64544968ed7ebF5f9bf05F3147e679D48a2491e4',
  },
  // Polygon Amoy (ERC-20)
  POLYGON: {
    USDT: '0x0Fa810dBd9A10Dd4B9C7C660D2c44dA31F9a7A6C',
    // Circle-native USDC on Amoy (proxy).
    USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  },
};

// Solana uses program/mint addresses, not the standard 0x contract format.
export const STABLECOIN_MINTS_SOLANA: Record<string, string> = {
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

/**
 * Solana devnet mints. There is no official devnet USDT mint; USDC is
 * Circle's devnet faucet mint. USDT intentionally resolves to null on
 * devnet so callers report "mint not configured" instead of querying a
 * nonexistent mainnet mint (which previously crashed with "Token mint
 * could not be unpacked").
 */
export const STABLECOIN_MINTS_SOLANA_TESTNET: Record<string, string> = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

export type CryptoProvider = 'alchemy';
export type ChainKind = 'EVM' | 'BTC';

/** Canonical on-chain chain identifiers supported across the system. */
export type Chain =
  | 'ETH'
  | 'BSC'
  | 'POLYGON'
  | 'SOLANA'
  | 'TRON';

/** Underlying address/key family that a chain uses. */
export type ChainFamily = 'EVM' | 'BTC' | 'SOLANA' | 'TRON';

export const EVM_CHAINS: readonly Chain[] = ['ETH', 'BSC', 'POLYGON'] as const;

/**
 * Central configuration for the hybrid webhook-based crypto architecture.
 * EVM deposits arrive via Alchemy Address Activity Webhook; BTC deposits
 * arrive via Alchemy WebSocket subscribeAddresses; Solana arrives via an
 * Alchemy Address Activity webhook; TRON is picked up by a scheduled poller.
 * Everything is processed by a unified WebhookProcessorService.
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
    if (!this.solMasterMnemonic) {
      this.logger.warn(
        'No Solana master mnemonic configured (HD_SOL_MASTER_MNEMONIC); Solana address/private-key derivation will fail.',
      );
    }
    if (!this.tronMasterMnemonic) {
      this.logger.warn(
        'No TRON master mnemonic configured (HD_TRON_MASTER_MNEMONIC); TRON address/private-key derivation will fail.',
      );
    }
    if (!this.alchemySigningKey) {
      this.logger.warn(
        'ALCHEMY_SIGNING_KEY is not set; Alchemy webhook signature verification will fail.',
      );
    }
    this.validateConfiguredContracts();
  }

  /**
   * EIP-55 checksum-validates every contract address this service can emit
   * (built-in maps + env overrides) so a mistyped address surfaces as a
   * loud boot warning instead of a runtime "bad address checksum" error
   * deep inside a balance query.
   */
  private validateConfiguredContracts(): void {
    const candidates: Array<[string, string, string | null]> = [];
    const sets: Array<Record<string, string>> = [
      ...Object.values(STABLECOIN_CONTRACTS_BY_CHAIN),
      ...Object.values(STABLECOIN_CONTRACTS_BY_CHAIN_TESTNET),
      STABLECOIN_CONTRACTS_MAINNET,
      STABLECOIN_CONTRACTS_TESTNET,
    ];
    for (const set of sets) {
      for (const [token, address] of Object.entries(set)) {
        if (address.startsWith('0x')) candidates.push([token, address, address]);
      }
    }
    for (const chain of this.supportedChains) {
      for (const token of ['USDT', 'USDC']) {
        const override = this.configService.get<string>(
          `ALCHEMY_${chain}_${token}_CONTRACT`,
        );
        if (override) candidates.push([`${chain}/${token}`, override, override]);
      }
    }
    for (const [label, raw, address] of candidates) {
      if (!address) continue;
      try {
        if (getAddress(address) !== address) {
          this.logger.warn(
            `Stablecoin contract for ${label} has invalid EIP-55 checksum: ${address} (expected ${getAddress(address)})`,
          );
        }
      } catch {
        this.logger.warn(
          `Stablecoin contract for ${label} is not a valid 0x address: ${raw}`,
        );
      }
    }
  }

  // ─── Chain helpers ────────────────────────────────────────────────────────

  /** All supported on-chain chains for crypto deposit wallets. */
  get supportedChains(): readonly Chain[] {
    return ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
  }

  /** Underlying family (address format / key scheme) for a chain. */
  chainFamily(chain: string): ChainFamily {
    switch (chain) {
      case 'EVM':
      case 'ETH':
      case 'BSC':
      case 'POLYGON':
        return 'EVM';
      case 'SOLANA':
        return 'SOLANA';
      case 'TRON':
        return 'TRON';
      default:
        return 'BTC';
    }
  }

  /** Whether the chain is part of the EVM family (shares a 0x address). */
  isEvmChain(chain: string): boolean {
    return this.chainFamily(chain) === 'EVM';
  }

  /**
   * Alchemy network slug for a chain, based on the global testnet/mainnet
   * toggle (see ALCHEMY_NETWORK).
   */
  networkForChain(chain: Chain): string {
    const suffix = this.isTestnet ? 'testnet' : 'mainnet';
    switch (chain) {
      case 'ETH':
        return this.isTestnet ? 'eth-sepolia' : 'eth-mainnet';
      case 'BSC':
        return this.isTestnet ? 'bsc-sapolia' : 'bsc-mainnet';
      case 'POLYGON':
        return this.isTestnet ? 'polygon-amoy' : 'polygon-mainnet';
      case 'SOLANA':
        return suffix;
      case 'TRON':
        return this.isTestnet ? 'tron-shasta' : 'tron-mainnet';
    }
  }

  /**
   * The exact Alchemy `network` field value reported in Address Activity
   * webhook payloads for a chain. Used to route an inbound webhook to the
   * correct chain context.
   */
  webhookNetworkForChain(chain: Chain): string {
    switch (chain) {
      case 'ETH':
        return this.isTestnet ? 'ETH_SEPOLIA' : 'ETH_MAINNET';
      case 'BSC':
        return this.isTestnet ? 'BSC_TESTNET' : 'BSC_MAINNET';
      case 'POLYGON':
        return this.isTestnet ? 'MATIC_AMOY' : 'MATIC_MAINNET';
      case 'SOLANA':
        return this.isTestnet ? 'SOLANA_DEVNET' : 'SOLANA_MAINNET';
      case 'TRON':
        // Alchemy TRON HTTP poller does not use network-routed webhooks.
        return this.isTestnet ? 'TRON_SHASTA' : 'TRON_MAINNET';
    }
  }

  /** Maps an Alchemy webhook `network` string back to its Canonical Chain. */
  chainFromWebhookNetwork(network: string): Chain | null {
    const n = (network || '').toUpperCase();
    switch (n) {
      case 'ETH_MAINNET':
      case 'ETH_SEPOLIA':
      case 'ETH_SEPOLIA_AMOY':
        return 'ETH';
      case 'BSC_MAINNET':
      case 'BSC_TESTNET':
        return 'BSC';
      case 'MATIC_MAINNET':
      case 'MATIC_AMOY':
      case 'POLYGON_MAINNET':
      case 'POLYGON_AMOY':
        return 'POLYGON';
      case 'SOLANA_MAINNET':
      case 'SOLANA_DEVNET':
        return 'SOLANA';
      case 'TRON_MAINNET':
      case 'TRON_SHASTA':
        return 'TRON';
      default:
        return null;
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

  // ─── Solana HD Master ──────────────────────────────────────────────────────

  get solMasterMnemonic(): string | null {
    return this.configService.get<string>('HD_SOL_MASTER_MNEMONIC') || null;
  }

  get solMasterXpub(): string | null {
    return this.configService.get<string>('HD_SOL_MASTER_XPUB') || null;
  }

  /** Solana Ed25519 derivation: m/44'/501'/{account}'/0'/{index}. */
  get solDerivationPath(): string {
    return (
      this.configService.get<string>('HD_SOL_DERIVATION_PATH', "m/44'/501'/0'/0'") ||
      "m/44'/501'/0'/0'"
    );
  }

  get solAccountIndex(): number {
    return Number(this.configService.get<string>('HD_SOL_ACCOUNT', '0'));
  }

  // ─── TRON HD Master ──────────────────────────────────────────────────────

  get tronMasterMnemonic(): string | null {
    return this.configService.get<string>('HD_TRON_MASTER_MNEMONIC') || null;
  }

  get tronMasterXpub(): string | null {
    return this.configService.get<string>('HD_TRON_MASTER_XPUB') || null;
  }

  /** TRON BIP-44 derivation: m/44'/195'/0'/0/{index}. */
  get tronDerivationPath(): string {
    return (
      this.configService.get<string>('HD_TRON_DERIVATION_PATH', "m/44'/195'/0'/0") ||
      "m/44'/195'/0'/0"
    );
  }

  get tronAccountIndex(): number {
    return Number(this.configService.get<string>('HD_TRON_ACCOUNT', '0'));
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

  // ─── Per-chain Alchemy (HTTP RPC + webhook) ──────────────────────────────

  /**
   * HTTP JSON-RPC URL for a chain, from `ALCHEMY_<CHAIN>_HTTP_URL`.
   * EVM-family chains and Solana use a per-chain endpoint; on testnet the
   * intended values are eth-sepolia / bsc-sapolia / polygon-amoy /
   * solana-devnet; on mainnet the corresponding -mainnet endpoints.
   */
  httpUrlForChain(chain: string): string | null {
    const value = this.configService.get<string>(`ALCHEMY_${chain}_HTTP_URL`);
    if (value) return value;
    // Back-compat: ALCHEMY_ETH_HTTP_URL is the legacy ETH endpoint.
    if (chain === 'ETH') return this.alchemyEthHttpUrl;
    return null;
  }

  /** Per-chain Alchemy Notify webhook ID (`ALCHEMY_<CHAIN>_WEBHOOK_ID`). */
  webhookIdForChain(chain: Chain): string | null {
    const value = this.configService.get<string>(`ALCHEMY_${chain}_WEBHOOK_ID`);
    if (value) return value;
    // Back-compat: ALCHEMY_WEBHOOK_ID is the legacy (ETH) webhook.
    if (chain === 'ETH') return this.alchemyWebhookId;
    return null;
  }

  /** Per-chain Alchemy Notify auth token (`ALCHEMY_<CHAIN>_AUTH_TOKEN`). */
  authTokenForChain(chain: Chain): string | null {
    const value = this.configService.get<string>(`ALCHEMY_${chain}_AUTH_TOKEN`);
    if (value) return value;
    // Back-compat: ALCHEMY_AUTH_TOKEN is the legacy (ETH) token.
    if (chain === 'ETH') return this.alchemyAuthToken;
    return null;
  }

  /**
   * Per-chain Alchemy webhook signing key (`ALCHEMY_<CHAIN>_SIGNING_KEY`) used
   * to verify `X-Alchemy-Signature`. Each Alchemy Address Activity webhook is
   * scoped to a single network and carries its own signing key, so verification
   * must use the key for the chain that delivered the payload. Falls back to
   * the global ALCHEMY_SIGNING_KEY when a per-chain key is not set.
   */
  signingKeyForChain(chain: string): string | null {
    const key = this.configService.get<string>(`ALCHEMY_${chain}_SIGNING_KEY`);
    if (key) return key;
    // Back-compat/fallback: the global key (ETH) when a per-chain key is absent.
    return this.alchemySigningKey;
  }

  /**
   * The unique set of Alchemy webhook signing keys configured for any chain
   * (global + per-chain). Used to verify an inbound Alchemy webhook without
   * relying on the payload's `network` field, since each Alchemy webhook signs
   * with its own key and the exact network enum values vary by chain/product.
   */
  allSigningKeys(): string[] {
    const keys = new Set<string>();
    for (const chain of [...this.supportedChains, '']) {
      const key =
        chain === '' ? this.alchemySigningKey : this.signingKeyForChain(chain);
      if (key) keys.add(key);
    }
    return [...keys];
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

  /**
   * Confirmation depth required before crediting a deposit / finalizing a
   * withdrawal for a given chain (`BLOCK_CONFIRMATIONS_<CHAIN>`). Sensible
   * defaults chosen from each network's reorg-depth profile.
   */
  confirmationsFor(chain: string): number {
    const key = `BLOCK_CONFIRMATIONS_${chain}`;
    const configured = this.configService.get<string>(key);
    if (configured) return Number(configured);
    switch (chain) {
      case 'ETH':
        return 12;
      case 'BSC':
        return 15;
      case 'POLYGON':
        return 128;
      case 'SOLANA':
        return 32;
      case 'TRON':
        return 19;
      default:
        return 2;
    }
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

  // ─── TRON Poller ────────────────────────────────────────────────────────

  /** Cron schedule driving the TRON TRC-20 deposit poller (from .env). */
  get tronPollCronSchedule(): string {
    return (
      this.configService.get<string>('TRON_POLL_CRON_SCHEDULE') || '0 */6 * * *'
    );
  }

  // ─── Stablecoin Contracts ────────────────────────────────────────────────

  /**
   * Resolves the contract/mint address for a (chain, token) pair.
   * - EVM-family chains (ETH/BSC/POLYGON): optional `ALCHEMY_<CHAIN>_<TOKEN>_CONTRACT`
   *   override, else per-chain map, else the canonical EVM mainnet/testnet set.
   * - SOLANA: SPL Token mint address.
   * - TRON: TRC-20 smart-contract address.
   */
  getStablecoinContractFor(chain: string, currency: string): string | null {
    const upper = (currency || '').toUpperCase();
    if (chain === 'SOLANA') {
      if (this.isTestnet) {
        return STABLECOIN_MINTS_SOLANA_TESTNET[upper] || null;
      }
      return STABLECOIN_MINTS_SOLANA[upper] || null;
    }
    const overrideKey = `ALCHEMY_${chain}_${upper}_CONTRACT`;
    const override = this.configService.get<string>(overrideKey);
    if (override) return override;
    const byChain = this.isTestnet
      ? STABLECOIN_CONTRACTS_BY_CHAIN_TESTNET[chain]
      : STABLECOIN_CONTRACTS_BY_CHAIN[chain];
    if (byChain && byChain[upper]) return byChain[upper];
    if (this.isEvmChain(chain)) {
      return this.getStablecoinContract(upper);
    }
    return null;
  }

  /** Back-compat EVM contract lookup (defaults to the ETH network). */
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
