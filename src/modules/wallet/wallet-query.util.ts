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