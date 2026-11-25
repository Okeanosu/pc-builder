import type { Redis } from './redis';

const KEY = 'catalog:version';

/**
 * Monotonic counter included in every catalog-derived cache key (engine candidates, recommendations).
 * Bump it whenever prices, stock, reservations, specs or purpose weights change — stale entries then
 * simply stop being read and expire by TTL, so no key scanning is needed.
 */
export async function getCatalogVersion(redis: Redis): Promise<number> {
  return Number((await redis.get(KEY)) ?? 0);
}

export async function bumpCatalogVersion(redis: Redis): Promise<number> {
  return redis.incr(KEY);
}
