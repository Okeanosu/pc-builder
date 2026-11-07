import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { cartItems, carts } from '../../db/schema';
import type { Redis } from '../../lib/redis';

export interface CartLine {
  id: string;
  productId: string;
  buildId: string | null;
  qty: number;
}

/** Backing storage for one cart; quantities are absolute (callers do the arithmetic). */
export interface CartStore {
  list(): Promise<CartLine[]>;
  set(productId: string, buildId: string | null, qty: number): Promise<void>;
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

const parseGuestHash = (raw: Record<string, string>) =>
  Object.entries(raw).flatMap(([field, qty]) => parseGuestField(field, qty) ?? []);

/** Reads and deletes a guest cart in one MULTI so concurrent logins cannot merge it twice. */
export async function claimGuestCart(redis: Redis, guestId: string): Promise<CartLine[]> {
  const result = await redis.multi().hgetall(guestCartKey(guestId)).del(guestCartKey(guestId)).exec();
  const raw = result?.[0]?.[1] as Record<string, string> | undefined;
  return raw ? parseGuestHash(raw) : [];
}

export function guestCartStore(redis: Redis, guestId: string): CartStore {
  const key = guestCartKey(guestId);
  return {
    async list() {
      return parseGuestHash(await redis.hgetall(key));
    },
    async set(productId, buildId, qty) {
      await redis
        .multi()
        .hset(key, guestField(productId, buildId), String(qty))
        .expire(key, GUEST_CART_TTL_SECONDS)
        .exec();
    },
    async remove(lines) {
      if (lines.length === 0) return;
      await redis.hdel(key, ...lines.map((l) => guestField(l.productId, l.buildId)));
    },
  };
}

const sameBuild = (buildId: string | null) =>
  buildId === null ? isNull(cartItems.buildId) : eq(cartItems.buildId, buildId);

export function userCartStore(db: Db, userId: string): CartStore {
  let cartId: string | undefined;
  async function ensureCart(): Promise<string> {
    if (cartId) return cartId;
    await db.insert(carts).values({ userId }).onConflictDoNothing({ target: carts.userId });
    const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
    cartId = row!.id;
    return cartId;
  }

  return {
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
    async set(productId, buildId, qty) {
      const id = await ensureCart();
      const updated = await db
        .update(cartItems)
        .set({ qty })
        .where(and(eq(cartItems.cartId, id), eq(cartItems.productId, productId), sameBuild(buildId)))
        .returning({ id: cartItems.id });
      if (updated.length === 0) await db.insert(cartItems).values({ cartId: id, productId, buildId, qty });
      await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, id));
    },
    async remove(lines) {
      if (lines.length === 0) return;
      const id = await ensureCart();
      const retail = lines.filter((l) => l.buildId === null).map((l) => l.productId);
      const byBuild = lines.filter((l) => l.buildId !== null);
      if (retail.length > 0) {
        await db
          .delete(cartItems)
          .where(
            and(eq(cartItems.cartId, id), isNull(cartItems.buildId), inArray(cartItems.productId, retail)),
          );
      }
      for (const l of byBuild) {
        await db
          .delete(cartItems)
          .where(and(eq(cartItems.cartId, id), eq(cartItems.productId, l.productId), sameBuild(l.buildId)));
      }
    },
  };
}
