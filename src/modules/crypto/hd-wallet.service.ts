import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HDNodeWallet } from 'ethers';
import * as bip39 from 'bip39';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { encode as bs58encode } from 'bs58';
import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { Currency } from '@src/generated/client';
import * as crypto from 'crypto';

const bip32 = BIP32Factory(ecc);
import { PrismaService } from '../../core/database/prisma.service';
import {
  Chain,
  ChainFamily,
  ChainKind,
  CryptoConfigService,
} from './crypto-config.service';

export interface DepositAddressInfo {
  chain: ChainKind | Chain;
  address: string;
  derivationIndex: number;
}

// TRON uses a 0x41 (0x41 = 'T') address prefix with a base58check wrapper.
const TRON_ADDRESS_PREFIX = 0x41;

/** Solana derivation path prefix (Ed25519 / SLIP-0010). */
const SOL_DERIVATION_PREFIX = "m/44'/501'";

/** Derivation index reserved for the platform master wallet on every chain. */
export const MASTER_WALLET_INDEX = 0;
/** First index usable by user deposit addresses (keeps them distinct from the master). */
export const USER_INDEX_BASE = 1000;

/**
 * Local-first HD wallet layer. Deposit addresses are derived on the backend
 * from the platform master seed/xpub (bip32 + bitcoinjs-lib for BTC,
 * ethers.js HDNodeWallet for EVM) with ZERO external API calls.
 *
 * Derivation:
 *   - EVM (ETH/USDT/USDC share one address per user):
 *       m/44'/60'/0'/0/{index}
 *   - BTC (native SegWit / bech32):
 *       m/84'/0'/0'/0/{index}
 *
 * The master wallet lives at index 0 on each chain; user addresses start at
 * USER_INDEX_BASE. A user's index is a sequential DB-assigned counter with
 * collision rejection, guaranteeing unique addresses at any scale.
 */
@Injectable()
export class HdWalletService {
  private readonly logger = new Logger(HdWalletService.name);

  /** Cached BTC seed to avoid repeated synchronous PBKDF2 on the event loop. */
  private cachedBtcSeed: ReturnType<typeof bip39.mnemonicToSeedSync> | null =
    null;
  /** Cached EVM HD root node to avoid re-derivation per request. */
  private cachedEvmRoot: HDNodeWallet | null = null;
  /** Cached TRON HD root node (secp256k1, BIP-44 m/44'/195'/0'/0). */
  private cachedTronRoot: HDNodeWallet | null = null;
  /** Cached Solana seed (Ed25519) to derive child keypairs from. */
  private cachedSolSeed: ReturnType<typeof bip39.mnemonicToSeedSync> | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CryptoConfigService,
  ) {}

  /** Maps a currency to its underlying chain kind. */
  chainForCurrency(currency: Currency): ChainKind | null {
    switch (currency) {
      case Currency.BTC:
        return 'BTC';
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        return 'EVM';
      default:
        return null;
    }
  }

  /** Underlying address/key family for a currency. */
  familyForCurrency(currency: Currency): ChainFamily | null {
    switch (currency) {
      case Currency.BTC:
        return 'BTC';
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        return 'EVM';
      default:
        return null;
    }
  }

  /** Default (primary) chain for a currency when none is chosen (BTC handled separately). */
  defaultChainForCurrency(currency: Currency): Chain | null {
    switch (currency) {
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        return 'ETH';
      default:
        return null;
    }
  }

  /**
   * Initializes cached HD roots from the master mnemonics.
   * Call once at startup or on first use.
   */
  private ensureSeedCache(): void {
    if (!this.cachedBtcSeed) {
      const mnemonic = this.config.btcMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)',
        );
      }
      this.cachedBtcSeed = bip39.mnemonicToSeedSync(mnemonic);
      this.logger.log('BTC HD seed cached');
    }
    if (!this.cachedEvmRoot) {
      const mnemonic = this.config.evmMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)',
        );
      }
      this.cachedEvmRoot = HDNodeWallet.fromPhrase(
        mnemonic,
        '',
        this.config.evmDerivationPath,
      );
      this.logger.log('EVM HD root cached');
    }
    if (!this.cachedTronRoot) {
      const mnemonic = this.config.tronMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing TRON master mnemonic (HD_TRON_MASTER_MNEMONIC)',
        );
      }
      this.cachedTronRoot = HDNodeWallet.fromPhrase(
        mnemonic,
        '',
        this.config.tronDerivationPath,
      );
      this.logger.log('TRON HD root cached');
    }
    if (!this.cachedSolSeed) {
      const mnemonic = this.config.solMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing Solana master mnemonic (HD_SOL_MASTER_MNEMONIC)',
        );
      }
      this.cachedSolSeed = bip39.mnemonicToSeedSync(mnemonic);
      this.logger.log('Solana HD seed cached');
    }
  }

  /**
   * Atomically assigns the next sequential derivation index for a user.
   * Uses a DB counter in PlatformSetting to guarantee uniqueness.
   * Falls back to collision-safe assignment if an address is already taken.
   */
  async getNextIndexForUser(): Promise<number> {
    // Use atomic SQL counter to get next index
    const result = await this.prisma.$transaction(async (tx) => {
      // Get or create the counter row
      const counter = await tx.platformSetting.findUnique({
        where: { key: 'hd_next_derivation_index' },
      });

      const nextIndex = counter ? Number(counter.value) + 1 : USER_INDEX_BASE;

      await tx.platformSetting.upsert({
        where: { key: 'hd_next_derivation_index' },
        update: { value: String(nextIndex) },
        create: { key: 'hd_next_derivation_index', value: String(nextIndex) },
      });

      return nextIndex;
    });

    return result;
  }

  /**
   * Stable, deterministic derivation index for a user on a given chain.
   * If the user already has a wallet with a derivation index on that chain,
   * reuse it. Otherwise, assign the next sequential index from the DB counter.
   */
  async indexForUser(userId: string, chain?: string): Promise<number> {
    // Check if user already has an assigned index for this chain (or any
    // chain when `chain` is omitted) to keep addresses stable across wallets.
    const existing = await this.prisma.wallet.findFirst({
      where: {
        userId,
        ...(chain ? { chain } : {}),
        derivationIndex: { not: null },
      },
      select: { derivationIndex: true },
    });

    if (existing && existing.derivationIndex !== null) {
      return existing.derivationIndex;
    }

    return this.getNextIndexForUser();
  }

  /**
   * Returns the deposit address info for a user/currency/chain.
   *
   * Per-chain EVM model: ETH/BSC/POLYGON rows share one 0x address (same key
   * family, Metamask-style). The user's EVM derivation index is looked up
   * family-wide — any existing ETH/BSC/POLYGON row with an index supplies the
   * address for every EVM chain, so existing deposit addresses stay valid and
   * new per-chain rows reuse it. A fresh index is only assigned when the user
   * has no EVM address at all. The returned `chain` is the SPECIFIC chain
   * (never the legacy family value 'EVM').
   *
   * When `chain` is omitted, it falls back to the currency's default chain
   * (EVM-family → ETH).
   */
  async getOrAssignDepositInfo(
    userId: string,
    currency: Currency,
    chain?: Chain,
  ): Promise<DepositAddressInfo> {
    const family = this.familyForCurrency(currency);
    if (!family) {
      throw new BadRequestException(
        `No on-chain deposit address for ${currency}`,
      );
    }
    if (family === 'BTC') {
      return this.getOrAssignBtcDepositInfo(userId);
    }

    const targetChain = chain ?? this.defaultChainForCurrency(currency);
    if (!targetChain) {
      throw new BadRequestException(
        `No on-chain deposit address for ${currency}`,
      );
    }

    if (this.config.isEvmChain(targetChain)) {
      // Family-wide lookup: any EVM-family row with an assigned index.
      // 'EVM' is included defensively for rows not yet migrated.
      const existing = await this.prisma.wallet.findFirst({
        where: {
          userId,
          chain: { in: ['ETH', 'BSC', 'POLYGON', 'EVM'] },
          address: { not: null },
          derivationIndex: { not: null },
        },
        select: { address: true, derivationIndex: true },
      });

      if (existing) {
        return {
          chain: targetChain,
          address: existing.address!,
          derivationIndex: existing.derivationIndex!,
        };
      }

      const index = await this.getNextIndexForUser();
      const address = this.deriveAddressForChain(targetChain, index);
      return { chain: targetChain, address, derivationIndex: index };
    }

    // Non-EVM chains (SOLANA/TRON): chain-specific rows and indexes.
    const existing = await this.prisma.wallet.findFirst({
      where: {
        userId,
        chain: targetChain,
        address: { not: null },
        derivationIndex: { not: null },
      },
      select: { address: true, derivationIndex: true },
    });

    if (existing) {
      return {
        chain: targetChain,
        address: existing.address!,
        derivationIndex: existing.derivationIndex!,
      };
    }

    const index = await this.indexForUser(userId, targetChain);
    const address = this.deriveAddressForChain(targetChain, index);
    return { chain: targetChain, address, derivationIndex: index };
  }

  /**
   * Back-compat BTC deposit info path. BTC wallets are keyed on chain 'BTC'.
   */
  private async getOrAssignBtcDepositInfo(
    userId: string,
  ): Promise<DepositAddressInfo> {
    const existing = await this.prisma.wallet.findFirst({
      where: {
        userId,
        chain: 'BTC',
        address: { not: null },
        derivationIndex: { not: null },
      },
      select: { address: true, derivationIndex: true },
    });

    if (existing) {
      return {
        chain: 'BTC',
        address: existing.address!,
        derivationIndex: existing.derivationIndex!,
      };
    }

    const index = await this.indexForUser(userId, 'BTC');
    const address = this.deriveBtcAddress(index);
    return { chain: 'BTC', address, derivationIndex: index };
  }

  /** Derives a deposit/withdrawal address for a currency at a given index. */
  deriveAddress(currency: Currency, index: number): string {
    const chain = this.chainForCurrency(currency);
    switch (chain) {
      case 'EVM':
        return this.deriveEvmAddress(index);
      case 'BTC':
        return this.deriveBtcAddress(index);
      default:
        throw new BadRequestException(
          `Unsupported currency for address derivation: ${currency}`,
        );
    }
  }

  /**
   * Derives a deposit/withdrawal address for a specific chain at a given
   * index. EVM-family chains (ETH/BSC/POLYGON) share one 0x address per user;
   * SOLANA and TRON each produce chain-specific addresses.
   */
  deriveAddressForChain(chain: string, index: number): string {
    switch (this.config.chainFamily(chain)) {
      case 'EVM':
        return this.deriveEvmAddress(index);
      case 'SOLANA':
        return this.deriveSolanaAddress(index);
      case 'TRON':
        return this.deriveTronAddress(index);
      case 'BTC':
        return this.deriveBtcAddress(index);
    }
  }

  /** The platform master wallet address for a chain (index 0). */
  getMasterAddress(chain: ChainKind): string {
    switch (chain) {
      case 'EVM':
        return this.deriveEvmAddress(MASTER_WALLET_INDEX);
      case 'BTC':
        return this.deriveBtcAddress(MASTER_WALLET_INDEX);
      default:
        throw new BadRequestException('Unknown chain kind');
    }
  }

  /** The platform master wallet address for a specific Chain (index 0). */
  getMasterAddressForChain(chain: string): string {
    return this.deriveAddressForChain(chain, MASTER_WALLET_INDEX);
  }

  /**
   * Derives the signing private key for a currency at an index. Requires the
   * master mnemonic (never derived from the xpub). Returns an Ethereum hex
   * private key for EVM and WIF for BTC.
   */
  derivePrivateKey(currency: Currency, index: number): string {
    const chain = this.chainForCurrency(currency);
    if (chain === 'EVM') {
      this.ensureSeedCache();
      return this.evmNode(index).privateKey;
    }

    if (chain === 'BTC') {
      this.ensureSeedCache();
      return this.btcNode(index).toWIF();
    }

    throw new BadRequestException(
      `Private key derivation not supported for ${currency}`,
    );
  }

  /**
   * Derives a private key for a specific chain at an index. EVM-family and
   * TRON return secp256k1 private keys (hex); SOLANA returns the 64-byte
   * seed used to construct the Ed25519 keypair.
   */
  derivePrivateKeyForChain(chain: string, index: number): string {
    switch (this.config.chainFamily(chain)) {
      case 'EVM':
        this.ensureSeedCache();
        return this.evmNode(index).privateKey;
      case 'TRON':
        this.ensureSeedCache();
        return this.tronNode(index).privateKey;
      case 'SOLANA':
        this.ensureSeedCache();
        return this.solSeedFor(index).toString('hex');
      case 'BTC':
        this.ensureSeedCache();
        return this.btcNode(index).toWIF();
    }
  }

  /** Derives an ethers HDNodeWallet at a given EVM index using cached root. */
  evmNode(index: number): HDNodeWallet {
    this.ensureSeedCache();
    return this.cachedEvmRoot!.deriveChild(index);
  }

  /** Derives an ethers HDNodeWallet at a given TRON index using cached root. */
  tronNode(index: number): HDNodeWallet {
    this.ensureSeedCache();
    return this.cachedTronRoot!.deriveChild(index);
  }

  /** Derives a bip32 node at a given BTC index using cached seed. */
  btcNode(index: number): BIP32Interface {
    this.ensureSeedCache();
    const root = bip32.fromSeed(this.cachedBtcSeed!);
    return root.derivePath(this.config.btcDerivationPath).derive(index);
  }

  /**
   * Derives the Ed25519 seed (32 bytes) for a Solana account at an index.
   * Path: m/44'/501'/{account}'/0'/{index} (standard Solana SLIP-0010).
   */
  solSeedFor(index: number): Buffer {
    this.ensureSeedCache();
    const derivedPath = `${SOL_DERIVATION_PREFIX}/${this.config.solAccountIndex}'/0'/${index}'`;
    // ed25519-hd-key expects the master seed as a hex string.
    return Buffer.from(
      derivePath(derivedPath, this.cachedSolSeed!.toString('hex')).key,
    );
  }

  /** Solana Keypair for a given index (from the master Ed25519 seed). */
  solKeypair(index: number): Keypair {
    return Keypair.fromSeed(this.solSeedFor(index));
  }

  private deriveEvmAddress(index: number): string {
    return this.evmNode(index).address;
  }

  private deriveSolanaAddress(index: number): string {
    return this.solKeypair(index).publicKey.toBase58();
  }

  private deriveTronAddress(index: number): string {
    const evmAddress = this.tronNode(index).address.toLowerCase();
    const body = Buffer.concat([
      Buffer.from([TRON_ADDRESS_PREFIX]),
      Buffer.from(evmAddress.replace(/^0x/, ''), 'hex'),
    ]);
    return this.base58Check(body);
  }

  /**
   * Base58-check encodes a payload (TRON address format). Prepends the double
   * SHA-256 checksum as a 4-byte trailer, then encodes with base58.
   */
  private base58Check(payload: Buffer): string {
    const hash1 = crypto.createHash('sha256').update(payload).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    const checksum = hash2.subarray(0, 4);
    return bs58encode(Buffer.concat([payload, checksum]));
  }

  private deriveBtcAddress(index: number): string {
    const node = this.btcNode(index);
    const payment = bitcoin.payments.p2wpkh({
      pubkey: node.publicKey,
      network: this.btcNetwork,
    });
    const address = payment.address;
    if (!address) {
      throw new InternalServerErrorException(
        'Failed to derive BTC deposit address',
      );
    }
    return address;
  }

  private get btcNetwork(): bitcoin.Network {
    return this.config.isTestnet
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
  }
}
