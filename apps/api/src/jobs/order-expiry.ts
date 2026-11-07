import { and, asc, eq, lt } from 'drizzle-orm';
import { orders } from '../db/schema';
import type { AppDeps } from '../deps';
import { type AppliedTransition, afterTransitions, applyTransition } from '../modules/orders';

const BATCH = 200;

/**
 * Cancels unpaid orders whose hold has run out and releases their reserved units.
 * Each order is cancelled by one status-guarded UPDATE, so a payment committing concurrently wins.
 * Returns the codes that were actually expired.
 */
export async function expirePendingOrders(
  deps: Pick<AppDeps, 'db' | 'redis'>,
  now: Date = new Date(),
): Promise<string[]> {
  const due = await deps.db
    .select({ id: orders.id, code: orders.code, status: orders.status })
    .from(orders)
    .where(and(eq(orders.status, 'PENDING_PAYMENT'), lt(orders.expiresAt, now)))
    .orderBy(asc(orders.expiresAt))
    .limit(BATCH);

  const applied: AppliedTransition[] = [];
  for (const order of due) {
    const done = await deps.db.transaction((tx) => applyTransition(tx, order, 'CANCELLED', { now }));
    if (done) applied.push(done);
  }
  if (applied.length > 0) await afterTransitions(deps.redis, applied);
  return applied.map((a) => a.code);
}

export interface JobHandle {
  stop(): void;
}

export function startOrderExpiryJob(
  deps: Pick<AppDeps, 'db' | 'redis' | 'now'>,
  intervalMs = 60_000,
  onError: (err: unknown) => void = (err) => console.error('order expiry job failed', err),
): JobHandle {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    expirePendingOrders(deps, deps.now())
      .catch(onError)
      .finally(() => {
        running = false;
      });
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
