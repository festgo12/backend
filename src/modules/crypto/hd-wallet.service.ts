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
import { Currency } from '@src/generated/client';

const bip32 = BIP32Factory(ecc);
import { PrismaService } from '../../core/database/prisma.service';
import { ChainKind, CryptoConfigService } from './crypto-config.service';

export interface DepositAddressInfo {
  chain: ChainKind;
  address: string;
  derivationIndex: number;
}

/** Derivation index reserved for the platform master wallet on every chain. */
export const MASTER_WALLET_INDEX = 0;
/** First index usable by user deposit addresses (keeps them distinct from the master). */
export const USER_INDEX_BASE = 1000;
/** Width of the deterministic user-index space. */
export const USER_INDEX_SPACE = 2_000_000;

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
 * USER_INDEX_BASE. A user's index is a stable hash of their id, so every EVM
 * currency for the same user resolves to the same address.
 */
@Injectable()
export class HdWalletService {
  private readonly logger = new Logger(HdWalletService.name);

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

  isCryptoCurrency(currency: Currency): boolean {
    return this.chainForCurrency(currency) !== null;
  }

  /**
   * Stable, deterministic derivation index for a user. Collision odds are
   * ~1 in 2,000,000 per user; the registry still maps an address to all
   * wallets that reference it as a safety net.
   */
  indexForUser(userId: string): number {
    let h = 0;
    for (let i = 0; i < userId.length; i++) {
      h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0;
    }
    return USER_INDEX_BASE + (Math.abs(h) % USER_INDEX_SPACE);
  }

  /**
   * Returns the deposit address info for a user/currency, reusing the user's
   * existing on-chain address for that chain when one has already been
   * assigned (this is what unifies USDT/USDC/ETH onto a single EVM address).
   */
  async getOrAssignDepositInfo(
    userId: string,
    currency: Currency,
  ): Promise<DepositAddressInfo> {
    const chain = this.chainForCurrency(currency);
    if (!chain) {
      throw new BadRequestException(
        `No on-chain deposit address for ${currency}`,
      );
    }

    const existing = await this.prisma.wallet.findFirst({
      where: {
        userId,
        chain,
        address: { not: null },
        derivationIndex: { not: null },
      },
      select: { address: true, derivationIndex: true },
    });

    if (existing) {
      return {
        chain,
        address: existing.address!,
        derivationIndex: existing.derivationIndex!,
      };
    }

    const index = this.indexForUser(userId);
    const address = this.deriveAddress(currency, index);
    return { chain, address, derivationIndex: index };
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

  /** The platform master wallet address for a chain (index 0). */
  getMasterAddress(chain: ChainKind): string {
    return chain === 'EVM'
      ? this.deriveEvmAddress(MASTER_WALLET_INDEX)
      : this.deriveBtcAddress(MASTER_WALLET_INDEX);
  }

  /**
   * Derives the signing private key for a currency at an index. Requires the
   * master mnemonic (never derived from the xpub). Returns an Ethereum hex
   * private key for EVM and WIF for BTC.
   */
  derivePrivateKey(currency: Currency, index: number): string {
    const chain = this.chainForCurrency(currency);
    if (chain === 'EVM') {
      const mnemonic = this.config.evmMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)',
        );
      }
      return this.evmNode(index).privateKey;
    }

    if (chain === 'BTC') {
      const mnemonic = this.config.btcMasterMnemonic;
      if (!mnemonic) {
        throw new InternalServerErrorException(
          'Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)',
        );
      }
      return this.btcNode(index).toWIF();
    }

    throw new BadRequestException(
      `Private key derivation not supported for ${currency}`,
    );
  }

  /** Derives an ethers HDNodeWallet at a given EVM index. */
  evmNode(index: number): HDNodeWallet {
    const mnemonic = this.config.evmMasterMnemonic;
    if (!mnemonic) {
      throw new InternalServerErrorException(
        'Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)',
      );
    }
    return HDNodeWallet.fromPhrase(
      mnemonic,
      '',
      this.config.evmDerivationPath,
    ).deriveChild(index);
  }

  /** Derives a bip32 node at a given BTC index. */
  btcNode(index: number): BIP32Interface {
    const mnemonic = this.config.btcMasterMnemonic;
    if (!mnemonic) {
      throw new InternalServerErrorException(
        'Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)',
      );
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    return root.derivePath(this.config.btcDerivationPath).derive(index);
  }

  private deriveEvmAddress(index: number): string {
    return this.evmNode(index).address;
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
