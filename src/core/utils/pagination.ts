/**
 * Shared pagination clamp helper. Extracts and validates page/limit query
 * params with safe defaults and an upper bound on limit.
 *
 * Usage in controllers:
 *   const { page, limit, skip } = clampPagination(rawPage, rawLimit);
 */
export function clampPagination(
  rawPage?: string | number,
  rawLimit?: string | number,
  opts: { maxLimit?: number; defaultPage?: number; defaultLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const maxLimit = opts.maxLimit ?? 100;
  const defaultPage = opts.defaultPage ?? 1;
  const defaultLimit = opts.defaultLimit ?? 20;

  const page = Math.max(1, Math.floor(Number(rawPage)) || defaultPage);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(rawLimit)) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
