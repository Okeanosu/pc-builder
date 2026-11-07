import { CATEGORY_KEYS, type CartDTO, type CartItemDTO } from '@pc/shared';
import { eq, inArray } from 'drizzle-orm';
import type { Request } from 'express';
import { z } from 'zod';
import { builds } from '../../db/schema';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import {
  availableStock,
  effectivePrice,
  findProductsByIds,
  type ProductWithRefs,
  toProductSummary,
} from '../../lib/products';
import {
  type CartLine,
  type CartStore,
  type CartWriteResult,
  guestCartKey,
  guestCartStore,
  MAX_LINE_QTY,
  parseGuestHash,
  userCartStore,
} from './cart.store';
import { tryLock } from './redis-lock';

/** Who owns the cart for this request: a signed-in user (DB cart) or the anonymous visitor (Redis cart). */
export interface CartOwner {
  userId?: string;
  guestId?: string;
}

export const cartOwnerOf = (req: Request): CartOwner => ({ userId: req.user?.id, guestId: req.guestId });

const guid = z.guid();
export const isGuid = (value: string) => guid.safeParse(value).success;

export interface PricedCartLine extends CartLine {
  row: ProductWithRefs;
  unitPrice: number;
}

const categoryRank = (row: ProductWithRefs) => CATEGORY_KEYS.indexOf(row.categoryKey);

function sortLines(lines: PricedCartLine[]): PricedCartLine[] {
  return [...lines].sort(
    (a, b) =>
      (a.buildId ?? '').localeCompare(b.buildId ?? '') ||
      categoryRank(a.row) - categoryRank(b.row) ||
      a.row.product.name.localeCompare(b.row.product.name),
  );
}

export function insufficientStock(row: ProductWithRefs, requested: number): AppError {
  const available = availableStock(row.product);
  return new AppError(
    409,
    'INSUFFICIENT_STOCK',
    `"${row.product.name}" chỉ còn ${available} sản phẩm có thể đặt`,
    { productId: row.product.id, name: row.product.name, requested, available },
  );
}

function throwIfRejected(result: CartWriteResult, row: ProductWithRefs): void {
  if (result.ok) return;
  if (result.reason === 'QTY_LIMIT') {
    throw new AppError(422, 'QTY_LIMIT', `Mỗi sản phẩm tối đa ${MAX_LINE_QTY} chiếc trong giỏ`);
  }
  throw insufficientStock(row, result.total);
}

export function toCartDTO(lines: PricedCartLine[]): CartDTO {
  const items: CartItemDTO[] = lines.map((l) => ({
    id: l.id,
    product: toProductSummary(l.row),
    qty: l.qty,
    buildId: l.buildId,
    lineTotal: l.unitPrice * l.qty,
  }));
  return {
    items,
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
  };
}

const MERGE_LOCK_MS = 10_000;

export function createCartService(deps: Pick<AppDeps, 'db' | 'redis'>) {
  const { db, redis } = deps;

  /**
   * Moves a pending guest cart into the user's DB cart. The DB upsert runs first and the guest hash is
   * deleted only afterwards, so a failure keeps the guest lines for the next attempt. A short Redis lock
   * stops two concurrent requests from merging the same lines twice.
   */
  async function mergeGuestInto(store: ReturnType<typeof userCartStore>, guestId: string): Promise<void> {
    const key = guestCartKey(guestId);
    if ((await redis.hlen(key)) === 0) return;
    const lock = await tryLock(redis, `lock:cart-merge:${guestId}`, MERGE_LOCK_MS);
    if (!lock) return;
    try {
      const guestLines = parseGuestHash(await redis.hgetall(key));
      if (guestLines.length === 0) return;
      const sellable = new Set(
        (await findProductsByIds(db, [...new Set(guestLines.map((l) => l.productId))]))
          .filter((r) => r.product.status === 'ACTIVE')
          .map((r) => r.product.id),
      );
      const buildIds = [...new Set(guestLines.flatMap((l) => (l.buildId ? [l.buildId] : [])))];
      const knownBuilds = new Set(
        buildIds.length > 0
          ? (await db.select({ id: builds.id }).from(builds).where(inArray(builds.id, buildIds))).map(
              (b) => b.id,
            )
          : [],
      );
      await store.mergeIn(
        guestLines.filter((l) => sellable.has(l.productId) && (!l.buildId || knownBuilds.has(l.buildId))),
      );
      await redis.del(key);
    } finally {
      await lock.release();
    }
  }

  async function storeFor(owner: CartOwner): Promise<CartStore> {
    if (owner.userId) {
      const store = userCartStore(db, owner.userId);
      if (owner.guestId) await mergeGuestInto(store, owner.guestId);
      return store;
    }
    if (!owner.guestId) throw new AppError(400, 'NO_CART', 'Không xác định được giỏ hàng');
    return guestCartStore(redis, owner.guestId);
  }

  async function price(lines: CartLine[]): Promise<PricedCartLine[]> {
    const rows = await findProductsByIds(db, [...new Set(lines.map((l) => l.productId))]);
    const byId = new Map(rows.map((r) => [r.product.id, r]));
    return sortLines(
      lines.flatMap((l) => {
        const row = byId.get(l.productId);
        return row ? [{ ...l, row, unitPrice: effectivePrice(row.product) }] : [];
      }),
    );
  }

  async function activeProduct(productId: string): Promise<ProductWithRefs> {
    if (!isGuid(productId)) throw notFound('Sản phẩm');
    const [row] = await findProductsByIds(db, [productId]);
    if (row?.product.status !== 'ACTIVE') throw notFound('Sản phẩm');
    return row;
  }

  async function view(store: CartStore): Promise<CartDTO> {
    return toCartDTO(await price(await store.list()));
  }

  return {
    /** Runs the pending guest→user merge without reading the cart (checkout locks and reads it itself). */
    async prepare(owner: CartOwner): Promise<void> {
      await storeFor(owner);
    },

    /** Priced lines of the caller's cart (merging a pending guest cart first). */
    async lines(owner: CartOwner): Promise<PricedCartLine[]> {
      return price(await (await storeFor(owner)).list());
    },

    async get(owner: CartOwner): Promise<CartDTO> {
      return view(await storeFor(owner));
    },

    async addItem(owner: CartOwner, productId: string, qty: number): Promise<CartDTO> {
      const row = await activeProduct(productId);
      const store = await storeFor(owner);
      const result = await store.write({
        productId,
        buildId: null,
        qty,
        mode: 'add',
        available: availableStock(row.product),
      });
      throwIfRejected(result, row);
      return view(store);
    },

    async updateItem(owner: CartOwner, itemId: string, qty: number): Promise<CartDTO> {
      const store = await storeFor(owner);
      const line = (await store.list()).find((l) => l.id === itemId);
      if (!line) throw notFound('Sản phẩm trong giỏ');
      const [row] = await findProductsByIds(db, [line.productId]);
      if (!row) throw notFound('Sản phẩm');
      const result = await store.write({
        productId: line.productId,
        buildId: line.buildId,
        qty,
        mode: 'set',
        available: availableStock(row.product),
      });
      throwIfRejected(result, row);
      return view(store);
    },

    async removeItem(owner: CartOwner, itemId: string): Promise<CartDTO> {
      const store = await storeFor(owner);
      const line = (await store.list()).find((l) => l.id === itemId);
      if (!line) throw notFound('Sản phẩm trong giỏ');
      await store.remove([line]);
      return view(store);
    },

    /**
     * Adds each part of a stored build tagged with its id. Lines are written with absolute quantities, so
     * re-adding the same build is idempotent; if any part cannot be added, the parts added by this call are
     * removed again (all-or-nothing).
     */
    async addBuild(owner: CartOwner, buildId: string): Promise<CartDTO> {
      if (!isGuid(buildId)) throw notFound('Cấu hình');
      const [build] = await db.select().from(builds).where(eq(builds.id, buildId));
      if (!build) throw notFound('Cấu hình');
      const wanted = new Map<string, number>();
      for (const item of build.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + 1);

      const store = await storeFor(owner);
      const existing = await store.list();
      const rows = new Map(
        (await findProductsByIds(db, [...wanted.keys()])).map((r) => [r.product.id, r] as const),
      );
      const pending = [...wanted].filter(
        ([productId]) => !existing.some((l) => l.productId === productId && l.buildId === buildId),
      );
      for (const [productId, qty] of pending) {
        if (rows.get(productId)?.product.status === 'ACTIVE') continue;
        const name = build.items.find((i) => i.productId === productId)?.name ?? productId;
        throw new AppError(409, 'INSUFFICIENT_STOCK', `"${name}" đã ngừng kinh doanh`, {
          productId,
          name,
          requested: qty,
          available: 0,
        });
      }
      const added: { productId: string; buildId: string }[] = [];
      for (const [productId, qty] of pending) {
        const row = rows.get(productId)!;
        const result = await store.write({
          productId,
          buildId,
          qty,
          mode: 'set',
          available: availableStock(row.product),
        });
        if (!result.ok) {
          await store.remove(added);
          throwIfRejected(result, row);
        }
        added.push({ productId, buildId });
      }
      return view(store);
    },

    /** Drops the given lines (used after they were turned into an order). */
    async removeLines(owner: CartOwner, lines: Pick<CartLine, 'productId' | 'buildId'>[]): Promise<void> {
      await (await storeFor(owner)).remove(lines);
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
