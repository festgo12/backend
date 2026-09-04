import { Currency } from '@src/generated/client';

/**
 * Shared chain-resolution helpers for wallet queries.
 *
 * The `Wallet` model is keyed on `(userId, currency, chain)` so a user can
 * hold the same currency on multiple networks. Fiat (NGN) wallets use
 * `chain = null`; crypto wallets store either a legacy family value
 * ('EVM' / 'BTC') or a specific chain ('ETH' / 'BSC' / 'POLYGON' /
 * 'SOLANA' / 'TRON').
 *
 * Order/marketplace/gift-card flows settle against a user's primary wallet
 * for a currency (they have no chain context), so they resolve the primary
 * chain's wallet via these helpers.
 */

/**
 * Accepted `chain` column values when resolving a user's primary wallet for
 * a given currency. Returns an array of chain values to match, or `null` for
 * fiat (NGN) wallets, which are the single chain-less row.
 */
export function chainValuesForCurrency(currency: Currency): string[] | null {
  switch (currency) {
    case Currency.NGN:
      // Fiat — the wallet row has chain = NULL.
      return null;
    case Currency.BTC:
      return ['BTC'];
    case Currency.ETH:
      // ETH is Ethereum-only (plus legacy 'EVM' family rows). No BSC/POLYGON/
      // SOLANA/TRON ETH wallets — multichain is USDT/USDC only.
      return ['EVM', 'ETH'];
    case Currency.USDT:
    case Currency.USDC:
      // Primary balance wallet. EVM-family chains (plus legacy 'EVM') share
      // a single 0x address; SOLANA and TRON have their own distinct
      // addresses. All resolve as candidate primary rows.
      return ['EVM', 'ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
    default:
      return [];
  }
}

/**
 * Whether a currency is a fiat currency that uses chain = NULL.
 */
export function isFiatCurrency(currency: Currency): boolean {
  return currency === Currency.NGN;
}

/**
 * Builds the `Prisma.WalletWhereInput` fragment that selects a user's primary
 * wallet for a currency. Prefer the legacy/primary chain first for stable
 * resolution across old rows (chain='EVM') and new per-network rows.
 */
export function primaryWalletWhere(
  userId: string,
  currency: Currency,
): Record<string, unknown> {
  const chains = chainValuesForCurrency(currency);
  if (chains === null) {
    return { userId, currency, chain: null };
  }
  return { userId, currency, chain: { in: chains } };
}

/**
 * Chain values to match when resolving a wallet for a specific network.
 * Returns `null` for fiat (NGN). For EVM-family chains returns the exact
 * chain first with the legacy 'EVM' row as a fallback (legacy primary
 * wallets are stored with chain='EVM'); SOLANA/TRON/BTC/ETH resolve to a
 * single value. ETH is Ethereum-only, so 'ETH' maps to ['ETH', 'EVM'].
 */
export function chainValuesForCurrencyChain(
  currency: Currency,
  chain: string | null | undefined,
): string[] | null {
  if (currency === Currency.NGN) return null;
  const c = chain ?? undefined;
  if (!c) return chainValuesForCurrency(currency);
  if (currency === Currency.BTC) return ['BTC'];
  if (c === 'ETH' || c === 'EVM') return ['EVM', 'ETH'];
  if (c === 'BSC' || c === 'POLYGON') return [c, 'EVM'];
  return [c];
}

/**
 * Builds the `Prisma.WalletWhereInput` fragment selecting a user's wallet for
 * a specific chain. Deterministic priority: the exact chain row first, legacy
 * 'EVM' second for EVM-family chains.
 */
export function chainWalletWhere(
  userId: string,
  currency: Currency,
  chain: string | null | undefined,
): Record<string, unknown> {
  const chains = chainValuesForCurrencyChain(currency, chain);
  if (chains === null) {
    return { userId, currency, chain: null };
  }
  return { userId, currency, chain: { in: chains } };
}

/**
 * Resolves a user's wallet row for a specific chain, trying the exact chain
 * first and falling back to the legacy 'EVM' row for EVM-family chains so the
 * legacy primary wallet is still usable. `walletFindFirst` is a function
 * (e.g. `(where) => tx.wallet.findFirst({ where })`) so it works inside
 * transactions without leaking the Prisma client type.
 */
export async function resolveChainWallet<T>(
  walletFindFirst: (
    where: Record<string, unknown>,
  ) => Promise<T | null>,
  userId: string,
  currency: Currency,
  chain: string | null | undefined,
): Promise<T | null> {
  const chains = chainValuesForCurrencyChain(currency, chain);
  if (chains === null) {
    return walletFindFirst({ userId, currency, chain: null });
  }
  for (const c of chains) {
    const found = await walletFindFirst({ userId, currency, chain: c });
    if (found) return found;
  }
  return null;
}