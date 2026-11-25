/** Milliseconds until `expiresAt` (never negative); null when the order has no deadline. */
export function remainingMs(expiresAt: string | null | undefined, now: number): number | null {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return null;
  return Math.max(0, end - now);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 872_000 → "14:32"; an hour or more → "1:02:05". Rounds up so "00:00" only shows at the deadline. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
