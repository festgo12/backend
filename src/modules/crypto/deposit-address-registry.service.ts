import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  Chain,
  ChainFamily,
  ChainKind,
  CryptoConfigService,
} from './crypto-config.service';
import { AddressRegistrationService } from './address-registration.service';

export interface AddressRegistration {
  chain: ChainFamily;
  walletId: string;
}

/**
 * In-memory index of every active on-chain deposit address. Listeners match
 * inbound transfers against this set in O(1). The set is rebuilt from the
 * database on boot (cold start) and updated as new wallets are initialised.
 * A single address may map to multiple wallets (defensive; collisions are
 * near-impossible with the deterministic index scheme).
 *
 * On boot, all EVM addresses are pushed to Alchemy via PUT (replace list)
 * to ensure even pre-existing addresses are tracked. New addresses on wallet
 * init are added via PATCH (incremental).
 */
@Injectable()
export class DepositAddressRegistry implements OnApplicationBootstrap {
  private readonly logger = new Logger(DepositAddressRegistry.name);
  private readonly addresses = new Map<string, AddressRegistration[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly addressRegistration: AddressRegistrationService,
    private readonly config: CryptoConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.rebuild();
  }

  /** Rebuilds the in-memory set from all crypto wallets that have an address. */
  async rebuild(): Promise<void> {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        address: { not: null },
        currency: {
          in: [Currency.BTC, Currency.ETH, Currency.USDT, Currency.USDC],
        },
      },
      select: { id: true, address: true, chain: true, currency: true },
    });

    this.addresses.clear();
    for (const wallet of wallets) {
      const family = this.familyForChainValue(wallet.chain);
      this.add(wallet.address!, { chain: family, walletId: wallet.id }, false);
    }

    this.logger.log(
      `Deposit address registry loaded: ${this.addresses.size} unique addresses, ${wallets.length} wallets`,
    );

    // Boot-sync: push all provider-trackable addresses (EVM-family, Solana,
    // TRON) to their respective Alchemy webhooks; leaves the employee list as-is.
    const synced = this.bootSyncAllChains();
    if (synced > 0) {
      this.logger.log(
        `Boot-synced addresses across ${synced} chains to webhooks`,
      );
    }
  }

  /**
   * Pushes each chain's registered addresses to its provider webhook
   * (fire-and-forget). Returns the number of chains that had addresses.
   */
  private bootSyncAllChains(): number {
    const chainsWithAddresses: string[] = [];
    for (const chain of this.config.supportedChains) {
      const family = this.config.chainFamily(chain);
      const addrs = this.addressesForFamily(family);
      if (addrs.length > 0) {
        chainsWithAddresses.push(chain);
        void this.pushChainSnapshot(chain, addrs).catch(() => {
          // Errors already logged inside pushChainSnapshot
        });
      }
    }
    return chainsWithAddresses.length;
  }

  /** Replaces a chain's address list on its Alchemy webhook on boot. */
  private async pushChainSnapshot(
    chain: Chain,
    addresses: string[],
  ): Promise<void> {
    const webhookId = this.config.webhookIdForChain(chain);
    if (!webhookId) return;
    const authToken = this.config.authTokenForChain(chain);
    this.logger.log(
      `Boot-syncing ${addresses.length} addresses to ${chain} webhook...`,
    );
    await this.addressRegistration.replaceAllChainAddresses(
      chain,
      addresses,
      authToken,
      webhookId,
    );
  }

  /**
   * Registers an address for a wallet and pushes it to the webhook provider.
   * No-op if already registered (does not re-push to the provider).
   */
  register(address: string, chain: string, walletId: string) {
    const family = this.familyForChainValue(chain);
    const isNew = this.add(address, { chain: family, walletId }, true);
    if (isNew) {
      // Fire-and-forget: register with webhook provider (EVM/Solana/TRON via
      // Alchemy webhook, BTC via WebSocket).
      try {
        const canonicalChain = this.canonicalChainForFamily(family);
        this.addressRegistration.registerAddress(address, canonicalChain);
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Failed to register ${family} address ${address} with provider: ${err.message}`,
        );
      }
    }
  }

  /**
   * Adds an address to the in-memory map. Returns true if the address is new
   * (not previously registered for this wallet).
   */
  private add(
    address: string,
    registration: AddressRegistration,
    log: boolean,
  ): boolean {
    const key = this.keyFor(address, registration.chain);
    const existing = this.addresses.get(key);
    if (existing) {
      if (!existing.some((r) => r.walletId === registration.walletId)) {
        existing.push(registration);
        return true;
      }
      return false;
    }
    this.addresses.set(key, [registration]);
    if (log) {
      this.logger.debug(
        `Registered deposit address ${address} for wallet ${registration.walletId}`,
      );
    }
    return true;
  }

  /** Removes a wallet from the registry. */
  unregister(address: string, chain: string, walletId: string) {
    const family = this.familyForChainValue(chain);
    const key = this.keyFor(address, family);
    const existing = this.addresses.get(key);
    if (!existing) return;
    const remaining = existing.filter((r) => r.walletId !== walletId);
    if (remaining.length > 0) {
      this.addresses.set(key, remaining);
    } else {
      this.addresses.delete(key);
    }
  }

  /**
   * Looks up all wallets owning the given address. Returns an empty array
   * when the address is not tracked. `chain` may be a family or a specific
   * chain (e.g. 'ETH' -> 'EVM').
   */
  lookup(address: string, chain: string): AddressRegistration[] {
    const family = this.familyForChainValue(chain);
    return this.addresses.get(this.keyFor(address, family)) || [];
  }

  /** Whether the given address is tracked for the given chain. */
  has(address: string, chain: string): boolean {
    const family = this.familyForChainValue(chain);
    return this.addresses.has(this.keyFor(address, family));
  }

  /** All tracked addresses for a chain family. */
  addressesForChain(chain: string): string[] {
    return this.addressesForFamily(this.familyForChainValue(chain));
  }

  /** All tracked addresses for a chain family. */
  private addressesForFamily(family: ChainFamily): string[] {
    const out: string[] = [];
    for (const [key, registrations] of this.addresses.entries()) {
      if (registrations[0]?.chain === family) out.push(key);
    }
    return out;
  }

  get size(): number {
    return this.addresses.size;
  }

  /** Normalises address keys: lowercase for EVM, verbatim otherwise. */
  private keyFor(address: string, chain: ChainFamily): string {
    return chain === 'EVM' ? address.toLowerCase() : address;
  }

  /**
   * Maps a chain value (family or specific chain) to its registry key
   * family. Unknown values default to 'EVM'.
   */
  private familyForChainValue(chain: string | null | undefined): ChainFamily {
    switch (chain) {
      case 'BTC':
        return 'BTC';
      case 'SOLANA':
        return 'SOLANA';
      case 'TRON':
        return 'TRON';
      case 'EVM':
      case 'ETH':
      case 'BSC':
      case 'POLYGON':
      default:
        return 'EVM';
    }
  }

  /** Canonical Chain represented by a chain family. */
  private canonicalChainForFamily(family: ChainFamily): Chain | 'BTC' {
    switch (family) {
      case 'SOLANA':
        return 'SOLANA';
      case 'TRON':
        return 'TRON';
      case 'BTC':
        return 'BTC';
      case 'EVM':
      default:
        return 'ETH';
    }
  }
}
