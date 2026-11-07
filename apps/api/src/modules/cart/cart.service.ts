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
  claimGuestCart,
  guestCartStore,
  MAX_LINE_QTY,
  userCartStore,
} from './cart.store';

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

export function createCartService(deps: Pick<AppDeps, 'db' | 'redis'>) {
  const { db, redis } = deps;

  async function mergeGuestInto(store: CartStore, guestId: string): Promise<void> {
    const guestLines = await claimGuestCart(redis, guestId);
    if (guestLines.length === 0) return;
    const productIds = new Set(
      (
        await findProductsByIds(
          db,
          guestLines.map((l) => l.productId),
        )
      ).map((r) => r.product.id),
    );
    const buildIds = [...new Set(guestLines.flatMap((l) => (l.buildId ? [l.buildId] : [])))];
    const knownBuilds = new Set(
      buildIds.length > 0
        ? (await db.select({ id: builds.id }).from(builds).where(inArray(builds.id, buildIds))).map(
            (b) => b.id,
          )
        : [],
    );
    const existing = await store.list();
    for (const line of guestLines) {
      if (!productIds.has(line.productId)) continue;
      if (line.buildId && !knownBuilds.has(line.buildId)) continue;
      const current = existing.find((e) => e.productId === line.productId && e.buildId === line.buildId);
      await store.set(line.productId, line.buildId, Math.min(MAX_LINE_QTY, (current?.qty ?? 0) + line.qty));
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

  /** Total units of a product across the cart if `line` were replaced by `qty`. */
  function productTotal(lines: CartLine[], productId: string, skip: CartLine | undefined, qty: number) {
    return lines.filter((l) => l.productId === productId && l !== skip).reduce((s, l) => s + l.qty, qty);
  }

  async function setLineQty(
    store: CartStore,
    lines: CartLine[],
    row: ProductWithRefs,
    buildId: string | null,
    qty: number,
  ) {
    if (qty > MAX_LINE_QTY) {
      throw new AppError(422, 'QTY_LIMIT', `Mỗi sản phẩm tối đa ${MAX_LINE_QTY} chiếc trong giỏ`);
    }
    const line = lines.find((l) => l.productId === row.product.id && l.buildId === buildId);
    const total = productTotal(lines, row.product.id, line, qty);
    if (total > availableStock(row.product)) throw insufficientStock(row, total);
    await store.set(row.product.id, buildId, qty);
  }

  async function view(store: CartStore): Promise<CartDTO> {
    return toCartDTO(await price(await store.list()));
  }

  return {
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
      const lines = await store.list();
      const current = lines.find((l) => l.productId === productId && l.buildId === null);
      await setLineQty(store, lines, row, null, (current?.qty ?? 0) + qty);
      return view(store);
    },

    async updateItem(owner: CartOwner, itemId: string, qty: number): Promise<CartDTO> {
      const store = await storeFor(owner);
      const lines = await store.list();
      const line = lines.find((l) => l.id === itemId);
      if (!line) throw notFound('Sản phẩm trong giỏ');
      const [row] = await findProductsByIds(db, [line.productId]);
      if (!row) throw notFound('Sản phẩm');
      await setLineQty(store, lines, row, line.buildId, qty);
      return view(store);
    },

    async removeItem(owner: CartOwner, itemId: string): Promise<CartDTO> {
      const store = await storeFor(owner);
      const line = (await store.list()).find((l) => l.id === itemId);
      if (!line) throw notFound('Sản phẩm trong giỏ');
      await store.remove([line]);
      return view(store);
    },

    /** Adds each part of a stored build tagged with its id; parts already in the cart for it are kept as is. */
    async addBuild(owner: CartOwner, buildId: string): Promise<CartDTO> {
      if (!isGuid(buildId)) throw notFound('Cấu hình');
      const [build] = await db.select().from(builds).where(eq(builds.id, buildId));
      if (!build) throw notFound('Cấu hình');
      const wanted = new Map<string, number>();
      for (const item of build.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + 1);

      const store = await storeFor(owner);
      const lines = await store.list();
      const rows = new Map(
        (await findProductsByIds(db, [...wanted.keys()])).map((r) => [r.product.id, r] as const),
      );
      const toAdd: { row: ProductWithRefs; qty: number }[] = [];
      for (const [productId, qty] of wanted) {
        if (lines.some((l) => l.productId === productId && l.buildId === buildId)) continue;
        const row = rows.get(productId);
        if (row?.product.status !== 'ACTIVE') {
          const name = build.items.find((i) => i.productId === productId)?.name ?? productId;
          throw new AppError(409, 'INSUFFICIENT_STOCK', `"${name}" đã ngừng kinh doanh`, {
            productId,
            name,
            requested: qty,
            available: 0,
          });
        }
        const total = productTotal(lines, productId, undefined, qty);
        if (total > availableStock(row.product)) throw insufficientStock(row, total);
        toAdd.push({ row, qty });
      }
      for (const { row, qty } of toAdd) await store.set(row.product.id, buildId, qty);
      return view(store);
    },

    /** Drops the given lines (used after they were turned into an order). */
    async removeLines(owner: CartOwner, lines: Pick<CartLine, 'productId' | 'buildId'>[]): Promise<void> {
      await (await storeFor(owner)).remove(lines);
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
