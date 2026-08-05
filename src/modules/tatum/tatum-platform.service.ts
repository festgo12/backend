import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency, Role } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumWebhookService } from './tatum-webhook.service';
import * as crypto from 'crypto';

export const PLATFORM_EMAIL = 'platform@p2n.app';
export const PLATFORM_WALLET_INDEX_BASE = 900000;

@Injectable()
export class TatumPlatformService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TatumPlatformService.name);
  private readonly cryptoCurrencies = [
    Currency.BTC,
    Currency.ETH,
    Currency.USDT,
    Currency.USDC,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly tatumWallet: TatumWalletService,
    private readonly tatumWebhook: TatumWebhookService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.ensurePlatformWallets();
    } catch (error: any) {
      this.logger.error(
        `Failed to initialise platform wallets: ${error.message}`,
      );
    }
  }

  /**
   * Ensures the internal platform user and per-currency fee wallets exist.
   * Fee wallets hold the buyerFee leg of every settled trade on-chain and are
   * the ledger home for platform fee revenue.
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

      // Assign a stable derived address if missing so on-chain fees have a home.
      if (!wallet.address) {
        try {
          const xpub = await this.tatumWallet.getOrGenerateXpub(currency);
          const index =
            PLATFORM_WALLET_INDEX_BASE +
            this.tatumWallet.getAddressIndex(wallet.id);
          const address = await this.tatumWallet.generateAddress(
            currency,
            xpub,
            index,
          );
          wallet = await this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { address },
          });

          const chain = TatumWebhookService.notificationChain(currency);
          this.tatumWebhook
            .registerAddressSubscription(address, chain, currency)
            .catch((err: any) => {
              this.logger.warn(
                `Failed to register webhook for ${currency} fee address ${address}: ${err.message}`,
              );
            });
        } catch (error: any) {
          this.logger.error(
            `Failed to assign fee address for ${currency}: ${error.message}`,
          );
        }
      }

      wallets.push({ currency, id: wallet.id, address: wallet.address });
    }

    this.logger.log(`Platform wallets ready for user ${platformUser.id}`);
    return { userId: platformUser.id, wallets };
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
