import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChainKind } from './crypto-config.service';
import { AddressRegistrationService } from './address-registration.service';

export interface AddressRegistration {
  chain: ChainKind;
  walletId: string;
}

/**
 * In-memory index of every active on-chain deposit address. Listeners match
 * inbound transfers against this set in O(1). The set is rebuilt from the
 * database on boot (cold start) and updated as new wallets are initialised.
 * A single address may map to multiple wallets (defensive; collisions are
 * near-impossible with the deterministic index scheme).
 *
 * On register(), the address is also pushed to the appropriate webhook
 * provider (Alchemy for EVM, QuickNode KV Store for BTC).
 */
@Injectable()
export class DepositAddressRegistry implements OnApplicationBootstrap {
  private readonly logger = new Logger(DepositAddressRegistry.name);
  private readonly addresses = new Map<string, AddressRegistration[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly addressRegistration: AddressRegistrationService,
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
      const chain =
        (wallet.chain as ChainKind) || this.guessChain(wallet.currency);
      this.add(wallet.address!, { chain, walletId: wallet.id }, false);
    }

    this.logger.log(
      `Deposit address registry loaded: ${this.addresses.size} unique addresses, ${wallets.length} wallets`,
    );
  }

  /**
   * Registers an address for a wallet and pushes it to the webhook provider.
   * No-op if already registered (does not re-push to the provider).
   */
  register(address: string, chain: ChainKind, walletId: string) {
    const isNew = this.add(address, { chain, walletId }, true);
    if (isNew) {
      // Fire-and-forget: register with webhook provider
      this.addressRegistration
        .registerAddress(address, chain)
        .catch((error) => {
          const err = error as Error;
          this.logger.warn(
            `Failed to register ${chain} address ${address} with provider: ${err.message}`,
          );
        });
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
  unregister(address: string, chain: ChainKind, walletId: string) {
    const key = this.keyFor(address, chain);
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
   * when the address is not tracked.
   */
  lookup(address: string, chain: ChainKind): AddressRegistration[] {
    return this.addresses.get(this.keyFor(address, chain)) || [];
  }

  /** Whether the given address is tracked for the given chain. */
  has(address: string, chain: ChainKind): boolean {
    return this.addresses.has(this.keyFor(address, chain));
  }

  /** All tracked addresses for a chain. */
  addressesForChain(chain: ChainKind): string[] {
    const out: string[] = [];
    for (const [key, registrations] of this.addresses.entries()) {
      if (registrations[0]?.chain === chain) out.push(key);
    }
    return out;
  }

  get size(): number {
    return this.addresses.size;
  }

  /** Normalises address keys: lowercase for EVM, verbatim for BTC. */
  private keyFor(address: string, chain: ChainKind): string {
    return chain === 'EVM' ? address.toLowerCase() : address;
  }

  private guessChain(currency: Currency): ChainKind {
    return currency === Currency.BTC ? 'BTC' : 'EVM';
  }
}
