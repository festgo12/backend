import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency, Role } from '@src/generated/client';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import {
  Chain,
  CryptoConfigService,
  EVM_CHAINS,
} from './crypto-config.service';
import { MASTER_WALLET_INDEX } from './hd-wallet.service';
import * as crypto from 'crypto';

export const PLATFORM_EMAIL = 'platform@p2n.app';

/** Primary stored chain for a fee wallet, mirroring WalletService defaults. */
function feeWalletChain(currency: Currency): string {
  return currency === Currency.BTC ? 'BTC' : 'ETH';
}

/**
 * All (configuredChain, currency) pairs a platform fee wallet is created for.
 * BTC lives on its own chain; ETH is Ethereum-only (single EVM fee wallet);
 * USDT/USDC are multichain — one EVM fee wallet (shared 0x across ETH/BSC/
 * POLYGON) plus a Solana (SPL) and a TRON (TRC-20) fee wallet.
 */
function feeWalletPairs(
  cryptoCurrencies: Currency[],
  supportedChains: readonly Chain[],
): { currency: Currency; chain: string }[] {
  const pairs: { currency: Currency; chain: string }[] = [];
  const evmChains = supportedChains.filter((c) => EVM_CHAINS.includes(c));
  for (const currency of cryptoCurrencies) {
    if (currency === Currency.BTC) {
      pairs.push({ currency, chain: 'BTC' });
      continue;
    }
    if (currency === Currency.ETH) {
      // ETH is Ethereum-only — a single EVM fee wallet, not one per EVM chain.
      if (evmChains.includes('ETH')) pairs.push({ currency, chain: 'ETH' });
      continue;
    }
    // USDT / USDC — one EVM fee wallet (canonical EVM) + Solana + TRON.
    if (evmChains.includes('ETH')) pairs.push({ currency, chain: 'ETH' });
    if (supportedChains.includes('SOLANA')) {
      pairs.push({ currency, chain: 'SOLANA' });
    }
    if (supportedChains.includes('TRON')) {
      pairs.push({ currency, chain: 'TRON' });
    }
  }
  return pairs;
}

/**
 * Internal platform user + per-currency/per-chain fee wallets. Fee wallets
 * hold the buyerFee leg of every settled trade on-chain and are the ledger
 * home for platform fee revenue. Addresses are derived locally from the HD
 * master seed (unified EVM address across ETH/BSC/POLYGON; distinct Solana
 * and TRON addresses) with zero external API calls.
 *
 * Every platform fee wallet is pinned to MASTER_WALLET_INDEX (index 0) so the
 * address is a pure function of the HD mnemonic in .env and stays IDENTICAL
 * across database resets (unlike user wallets, which are keyed off the user
 * UUID). User deposit addresses start at USER_INDEX_BASE, so index 0 is never
 * claimed by a user.
 */
@Injectable()
export class PlatformService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformService.name);
  private readonly cryptoCurrencies = [
    Currency.BTC,
    Currency.ETH,
    Currency.USDT,
    Currency.USDC,
  ];

  /** Fee wallet (chain, currency) pairs derived from the supported chains. */
  private readonly pairs: { currency: Currency; chain: string }[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly hdWallet: HdWalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly cryptoConfig: CryptoConfigService,
  ) {
    this.pairs = feeWalletPairs(
      this.cryptoCurrencies,
      this.cryptoConfig.supportedChains,
    );
  }

  async onApplicationBootstrap() {
    try {
      await this.ensurePlatformWallets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialise platform wallets: ${message}`);
    }
  }

  /**
   * Ensures the internal platform user and per-currency fee wallets exist.
   * Assigns a locally-derived address to any fee wallet that lacks one.
   */
  async ensurePlatformWallets(): Promise<{
    userId: string;
    wallets: { currency: Currency; chain: string; id: string; address: string | null }[];
  }> {
    const platformUser = await this.prisma.user.upsert({
      where: { email: PLATFORM_EMAIL },
      update: { isSystem: true },
      create: {
        email: PLATFORM_EMAIL,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        role: Role.SUPER_ADMIN,
        isSystem: true,
      },
    });

    await this.persistMasterXpubs();

    const wallets: {
      currency: Currency;
      chain: string;
      id: string;
      address: string | null;
    }[] = [];

    for (const { currency, chain } of this.pairs) {
      let wallet = await this.prisma.wallet.findUnique({
        where: {
          userId_currency_chain: {
            userId: platformUser.id,
            currency,
            chain,
          },
        },
      });

      if (!wallet) {
        wallet = await this.prisma.wallet.create({
          data: { userId: platformUser.id, currency, chain, balance: 0 },
        });
      }

      // Assign a locally-derived address if missing so on-chain fees have a
      // home. Pinned to MASTER_WALLET_INDEX (index 0) so the address is a
      // deterministic function of the HD mnemonic and survives DB resets.
      if (!wallet.address) {
        try {
          const info = this.feeAddressForChain(chain);
          wallet = await this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              address: info.address,
              derivationIndex: info.derivationIndex,
              chain: info.chain,
            },
          });
          this.depositRegistry.register(info.address, info.chain, wallet.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to assign fee address for ${currency}/${chain}: ${message}`,
          );
        }
      }

      wallets.push({ currency, chain, id: wallet.id, address: wallet.address });
    }

    this.logger.log(`Platform wallets ready for user ${platformUser.id}`);
    return { userId: platformUser.id, wallets };
  }

  /** Derive the local address for a fee wallet on a specific chain (index 0). */
  private feeAddressForChain(chain: string): {
    chain: string;
    address: string;
    derivationIndex: number;
  } {
    if (chain === 'BTC') {
      return {
        chain: 'BTC',
        address: this.hdWallet.getMasterAddress('BTC'),
        derivationIndex: MASTER_WALLET_INDEX,
      };
    }
    if (chain === 'SOLANA') {
      return {
        chain: 'SOLANA',
        address: this.hdWallet.getMasterAddressForChain('SOLANA'),
        derivationIndex: MASTER_WALLET_INDEX,
      };
    }
    if (chain === 'TRON') {
      return {
        chain: 'TRON',
        address: this.hdWallet.getMasterAddressForChain('TRON'),
        derivationIndex: MASTER_WALLET_INDEX,
      };
    }
    // EVM-family chains (ETH/BSC/POLYGON) all share the single master EVM
    // address, but are stored as distinct per-chain wallet rows.
    return {
      chain,
      address: this.hdWallet.getMasterAddress('EVM'),
      derivationIndex: MASTER_WALLET_INDEX,
    };
  }

  /**
   * Mirrors the configured HD master xpubs into PlatformSetting so non-secret
   * (public) key material is available to tools that should not touch the
   * master mnemonic. Keys: master_xpub_evm / master_xpub_btc /
   * master_xpub_sol / master_xpub_tron.
   */
  private async persistMasterXpubs(): Promise<void> {
    // Solana uses Ed25519 (SLIP-0010), which has no BIP-32 "xpub". When the
    // optional env xpub is unset, expose the derived master public key (the
    // base58 master address) so the setting is populated with a real value.
    const solPubkey =
      this.cryptoConfig.solMasterXpub ||
      this.hdWallet.getMasterAddressForChain('SOLANA');
    const tronPubkey =
      this.cryptoConfig.tronMasterXpub ||
      this.hdWallet.getMasterAddressForChain('TRON');

    const xpubs: { key: string; value: string | null }[] = [
      { key: 'master_xpub_evm', value: this.cryptoConfig.evmMasterXpub },
      { key: 'master_xpub_btc', value: this.cryptoConfig.btcMasterXpub },
      { key: 'master_xpub_sol', value: solPubkey },
      { key: 'master_xpub_tron', value: tronPubkey },
    ];

    for (const entry of xpubs) {
      if (!entry.value) continue;
      await this.prisma.platformSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      });
    }
  }

  /**
   * Returns the internal platform fee wallet for a currency on a chain,
   * creating them on demand. `chain` defaults to the currency's primary
   * chain (BTC → 'BTC', otherwise 'ETH').
   */
  async getPlatformFeeWallet(currency: Currency, chain?: string) {
    await this.ensurePlatformWallets();
    const chainValue = chain ?? feeWalletChain(currency);
    return this.prisma.wallet.findUnique({
      where: {
        userId_currency_chain: {
          userId: await this.getPlatformUserId(),
          currency,
          chain: chainValue,
        },
      },
    });
  }

  async getPlatformUserId(): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email: PLATFORM_EMAIL },
    });
    if (!user) {
      await this.ensurePlatformWallets();
      const created = await this.prisma.user.findUnique({
        where: { email: PLATFORM_EMAIL },
      });
      return created!.id;
    }
    return user.id;
  }
}
