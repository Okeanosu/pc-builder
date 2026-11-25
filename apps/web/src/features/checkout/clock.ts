/**
 * Offsets smaller than this are treated as transfer/hydration delay rather than a wrong device clock;
 * the server only sweeps expired orders once a minute, so a few seconds never matter.
 */
export const SKEW_THRESHOLD_MS = 3000;

/**
 * Server-minus-client clock offset in ms. `serverTime` is a server timestamp (epoch ms, ISO string or
 * an HTTP `Date` header) observed when the client clock read `receivedAt`. Returns 0 when unknown.
 */
export function clockOffset(serverTime: number | string | null | undefined, receivedAt: number): number {
  if (serverTime === null || serverTime === undefined || serverTime === '') return 0;
  const server = typeof serverTime === 'number' ? serverTime : Date.parse(serverTime);
  if (!Number.isFinite(server) || !Number.isFinite(receivedAt)) return 0;
  const offset = server - receivedAt;
  return Math.abs(offset) < SKEW_THRESHOLD_MS ? 0 : offset;
}

interface NavigationLike {
  name: string;
  responseStart: number;
}

/** A navigation timing entry older than this belongs to an earlier visit, not the render being measured. */
export const MAX_RECEIPT_AGE_MS = 15_000;

/**
 * Device-clock time at which the server-rendered timestamp arrived: the document's first byte for a fresh
 * hard load of this URL, otherwise (client-side navigation) now. Elapsed time comes from the monotonic
 * `performance.now()` so a clock change after navigation cannot skew it.
 */
export function receiptTime(
  nav: NavigationLike | undefined,
  href: string,
  now: number,
  perfNow: number,
): number {
  if (!nav || nav.name !== href || nav.responseStart <= 0) return now;
  const elapsed = perfNow - nav.responseStart;
  return elapsed < 0 || elapsed > MAX_RECEIPT_AGE_MS ? now : now - elapsed;
}
