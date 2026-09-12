import { Currency } from '@src/generated/client';

/**
 * Shared chain-resolution helpers for wallet queries.
 *
 * The `Wallet` model is keyed on `(userId, currency, chain)` so a user can
 * hold the same currency on multiple networks. Fiat (NGN) wallets use
 * `chain = null`; crypto wallets store a specific chain ('ETH' / 'BSC' /
 * 'POLYGON' / 'SOLANA' / 'TRON' / 'BTC').
 *
 * Since the per-chain EVM refactor, each EVM network (ETH/BSC/POLYGON) has
 * its own independent wallet row and ledger balance; the legacy family value
 * 'EVM' no longer exists on new rows (old rows were migrated to 'ETH').
 *
 * Order/marketplace/gift-card flows settle against a user's primary wallet
 * for a currency (they have no chain context), so they resolve the primary
 * chain's wallet via these helpers.
 */

/** Canonical EVM chains that hold independent wallet rows. */
export const EVM_WALLET_CHAINS = ['ETH', 'BSC', 'POLYGON'] as const;

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
      // ETH is Ethereum-only. No BSC/POLYGON/SOLANA/TRON ETH wallets —
      // multichain is USDT/USDC only.
      return ['ETH'];
    case Currency.USDT:
    case Currency.USDC:
      // Primary balance wallet. Every supported network holds its own row.
      return ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
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
 * wallet for a currency. Prefers the ETH (Ethereum) row first for stable
 * resolution across the per-chain rows.
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
 * Returns `null` for fiat (NGN). Each supported chain maps to exactly itself:
 * per-chain EVM rows are independent, so 'BSC' resolves only the BSC row and
 * 'POLYGON' only the POLYGON row. Unrecognized chains resolve to themselves.
 */
export function chainValuesForCurrencyChain(
  currency: Currency,
  chain: string | null | undefined,
): string[] | null {
  if (currency === Currency.NGN) return null;
  const c = chain ?? undefined;
  if (!c) return chainValuesForCurrency(currency);
  if (currency === Currency.BTC) return ['BTC'];
  if (c === 'EVM') return ['ETH'];
  return [c];
}

/**
 * Builds the `Prisma.WalletWhereInput` fragment selecting a user's wallet for
 * a specific chain. Exact chain match — per-chain EVM rows are independent.
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
 * Resolves a user's wallet row for a specific chain. Since the per-chain EVM
 * refactor this is an exact match (no legacy 'EVM' fallback): 'BSC' resolves
 * only the BSC row, 'POLYGON' only the POLYGON row. `walletFindFirst` is a
 * function (e.g. `(where) => tx.wallet.findFirst({ where })`) so it works
 * inside transactions without leaking the Prisma client type.
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
