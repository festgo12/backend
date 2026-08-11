import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency, Role } from '@src/generated/client';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { MASTER_WALLET_INDEX } from './hd-wallet.service';
import * as crypto from 'crypto';

export const PLATFORM_EMAIL = 'platform@p2n.app';

/**
 * Internal platform user + per-currency fee wallets. Fee wallets hold the
 * buyerFee leg of every settled trade on-chain and are the ledger home for
 * platform fee revenue. Addresses are derived locally from the HD master seed
 * (unified EVM address across ETH/USDT/USDC) with zero external API calls.
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly hdWallet: HdWalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly cryptoConfig: CryptoConfigService,
  ) {}

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
    wallets: { currency: Currency; id: string; address: string | null }[];
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
      id: string;
      address: string | null;
    }[] = [];

    for (const currency of this.cryptoCurrencies) {
      let wallet = await this.prisma.wallet.findUnique({
        where: { userId_currency: { userId: platformUser.id, currency } },
      });

      if (!wallet) {
        wallet = await this.prisma.wallet.create({
          data: { userId: platformUser.id, currency, balance: 0 },
        });
      }

      // Assign a locally-derived address if missing so on-chain fees have a
      // home. Pinned to MASTER_WALLET_INDEX (index 0) so the address is a
      // deterministic function of the HD mnemonic and survives DB resets.
      // EVM currencies (ETH/USDT/USDC) all share the single master EVM address.
      if (!wallet.address) {
        try {
          const info =
            currency === Currency.BTC
              ? {
                  chain: 'BTC' as const,
                  address: this.hdWallet.getMasterAddress('BTC'),
                  derivationIndex: MASTER_WALLET_INDEX,
                }
              : {
                  chain: 'EVM' as const,
                  address: this.hdWallet.getMasterAddress('EVM'),
                  derivationIndex: MASTER_WALLET_INDEX,
                };
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
            `Failed to assign fee address for ${currency}: ${message}`,
          );
        }
      }

      wallets.push({ currency, id: wallet.id, address: wallet.address });
    }

    this.logger.log(`Platform wallets ready for user ${platformUser.id}`);
    return { userId: platformUser.id, wallets };
  }

  /**
   * Mirrors the configured HD master xpubs into PlatformSetting so non-secret
   * (public) key material is available to tools that should not touch the
   * master mnemonic. Keys are master_xpub_evm and master_xpub_btc.
   */
  private async persistMasterXpubs(): Promise<void> {
    const xpubs: { key: string; value: string | null }[] = [
      { key: 'master_xpub_evm', value: this.cryptoConfig.evmMasterXpub },
      { key: 'master_xpub_btc', value: this.cryptoConfig.btcMasterXpub },
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
   * Returns the internal platform fee wallet for a currency, creating it on demand.
   */
  async getPlatformFeeWallet(currency: Currency) {
    await this.ensurePlatformWallets();
    return this.prisma.wallet.findUnique({
      where: {
        userId_currency: { userId: await this.getPlatformUserId(), currency },
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
