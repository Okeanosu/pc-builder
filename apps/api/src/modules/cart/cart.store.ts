import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { cartItems, carts } from '../../db/schema';
import type { Redis } from '../../lib/redis';

export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface CartLine {
  id: string;
  productId: string;
  buildId: string | null;
  qty: number;
}

export interface CartWrite {
  productId: string;
  buildId: string | null;
  qty: number;
  /** add: increment the line; set: replace its quantity. */
  mode: 'add' | 'set';
  /** Units of this product the whole cart may hold (available stock at the time of the call). */
  available: number;
}

export type CartWriteResult =
  | { ok: true; qty: number }
  | { ok: false; reason: 'QTY_LIMIT'; qty: number }
  | { ok: false; reason: 'STOCK'; total: number };

/** Storage for one cart. `write` checks and applies a change atomically, so concurrent requests never lose units. */
export interface CartStore {
  list(): Promise<CartLine[]>;
  write(w: CartWrite): Promise<CartWriteResult>;
  remove(lines: Pick<CartLine, 'productId' | 'buildId'>[]): Promise<void>;
}

export const MAX_LINE_QTY = 20;
export const GUEST_CART_TTL_SECONDS = 7 * 24 * 3600;

export const guestCartKey = (guestId: string) => `cart:guest:${guestId}`;
const guestField = (productId: string, buildId: string | null) => `${productId}:${buildId ?? '-'}`;

function parseGuestField(field: string, qty: string): CartLine | null {
  const [productId, build] = field.split(':');
  const n = Number(qty);
  if (!productId || !build || !Number.isInteger(n) || n <= 0) return null;
  return { id: field, productId, buildId: build === '-' ? null : build, qty: n };
}

export const parseGuestHash = (raw: Record<string, string>) =>
  Object.entries(raw).flatMap(([field, qty]) => parseGuestField(field, qty) ?? []);

// Runs inside Redis, so the cap check, the stock check and the HINCRBY/HSET happen as one atomic step.
// KEYS[1] cart hash; ARGV: field, product prefix, qty, mode, cap, available, ttl.
// Returns {1, newQty} | {0, wantedQty} (cap exceeded) | {-1, productTotal} (stock exceeded).
const GUEST_WRITE = `
local current = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
local qty = tonumber(ARGV[3])
local wanted = qty
if ARGV[4] == 'add' then wanted = current + qty end
if wanted > tonumber(ARGV[5]) then return {0, wanted} end
local others = 0
local all = redis.call('HGETALL', KEYS[1])
for i = 1, #all, 2 do
  if all[i] ~= ARGV[1] and string.sub(all[i], 1, string.len(ARGV[2])) == ARGV[2] then
    others = others + tonumber(all[i + 1])
  end
end
if others + wanted > tonumber(ARGV[6]) then return {-1, others + wanted} end
if ARGV[4] == 'add' then
  redis.call('HINCRBY', KEYS[1], ARGV[1], qty)
else
  redis.call('HSET', KEYS[1], ARGV[1], wanted)
end
redis.call('EXPIRE', KEYS[1], ARGV[7])
return {1, wanted}`;

export function guestCartStore(redis: Redis, guestId: string): CartStore {
  const key = guestCartKey(guestId);
  return {
    async list() {
      return parseGuestHash(await redis.hgetall(key));
    },
    async write(w) {
      const [code, value] = (await redis.eval(
        GUEST_WRITE,
        1,
        key,
        guestField(w.productId, w.buildId),
        `${w.productId}:`,
        w.qty,
        w.mode,
        MAX_LINE_QTY,
        w.available,
        GUEST_CART_TTL_SECONDS,
      )) as [number, number];
      if (code === 1) return { ok: true, qty: value };
      return code === 0
        ? { ok: false, reason: 'QTY_LIMIT', qty: value }
        : { ok: false, reason: 'STOCK', total: value };
    },
    async remove(lines) {
      if (lines.length === 0) return;
      await redis.hdel(key, ...lines.map((l) => guestField(l.productId, l.buildId)));
    },
  };
}

/** Deletes the given lines of a DB cart; used by the store and inside the checkout transaction. */
export async function deleteCartLines(
  tx: DbTx,
  cartId: string,
  lines: Pick<CartLine, 'productId' | 'buildId'>[],
): Promise<void> {
  if (lines.length === 0) return;
  const keys = lines.map((l) => sql`(${l.productId}::uuid, ${l.buildId}::uuid)`);
  await tx.delete(cartItems).where(
    and(
      eq(cartItems.cartId, cartId),
      sql`EXISTS (SELECT 1 FROM (VALUES ${sql.join(keys, sql`, `)}) AS k(product_id, build_id)
          WHERE k.product_id = ${cartItems.productId} AND k.build_id IS NOT DISTINCT FROM ${cartItems.buildId})`,
    ),
  );
}

const lineKey = [cartItems.cartId, cartItems.productId, cartItems.buildId];

export function userCartStore(db: Db, userId: string) {
  let cartId: string | undefined;
  async function ensureCart(): Promise<string> {
    if (cartId) return cartId;
    await db.insert(carts).values({ userId }).onConflictDoNothing({ target: carts.userId });
    const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
    cartId = row!.id;
    return cartId;
  }

  const store: CartStore & {
    /** Adds guest lines in one upsert, summing with existing lines and capping each at MAX_LINE_QTY. */
    mergeIn(lines: Pick<CartLine, 'productId' | 'buildId' | 'qty'>[]): Promise<void>;
  } = {
    async list() {
      const id = await ensureCart();
      return db
        .select({
          id: cartItems.id,
          productId: cartItems.productId,
          buildId: cartItems.buildId,
          qty: cartItems.qty,
        })
        .from(cartItems)
        .where(eq(cartItems.cartId, id));
    },

    async write(w) {
      const id = await ensureCart();
      return db.transaction(async (tx): Promise<CartWriteResult> => {
        // The cart row lock serialises writers of this cart, so the checks below see every committed line.
        await tx.select({ id: carts.id }).from(carts).where(eq(carts.id, id)).for('update');
        const lines = await tx
          .select({ buildId: cartItems.buildId, qty: cartItems.qty })
          .from(cartItems)
          .where(and(eq(cartItems.cartId, id), eq(cartItems.productId, w.productId)));
        const current = lines.find((l) => l.buildId === w.buildId)?.qty ?? 0;
        const wanted = w.mode === 'add' ? current + w.qty : w.qty;
        if (wanted > MAX_LINE_QTY) return { ok: false, reason: 'QTY_LIMIT', qty: wanted };
        const total = lines.filter((l) => l.buildId !== w.buildId).reduce((s, l) => s + l.qty, wanted);
        if (total > w.available) return { ok: false, reason: 'STOCK', total };
        await tx
          .insert(cartItems)
          .values({ cartId: id, productId: w.productId, buildId: w.buildId, qty: w.qty })
          .onConflictDoUpdate({
            target: lineKey,
            set: {
              qty:
                w.mode === 'add'
                  ? sql`least(${cartItems.qty} + excluded.qty, ${MAX_LINE_QTY})`
                  : sql`excluded.qty`,
            },
          });
        await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, id));
        return { ok: true, qty: wanted };
      });
    },

    async remove(lines) {
      if (lines.length === 0) return;
      const id = await ensureCart();
      await db.transaction((tx) => deleteCartLines(tx, id, lines));
    },

    async mergeIn(lines) {
      if (lines.length === 0) return;
      const id = await ensureCart();
      await db
        .insert(cartItems)
        .values(
          lines.map((l) => ({
            cartId: id,
            productId: l.productId,
            buildId: l.buildId,
            qty: Math.min(l.qty, MAX_LINE_QTY),
          })),
        )
        .onConflictDoUpdate({
          target: lineKey,
          set: { qty: sql`least(${cartItems.qty} + excluded.qty, ${MAX_LINE_QTY})` },
        });
    },
  };
  return store;
}
