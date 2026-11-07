import type { CheckoutInput, OrderDTO, OrderStatus, OrderType, Paginated } from '@pc/shared';
import { and, count, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import { cartItems, carts, orderItems, orders, products } from '../../db/schema';
import type { AppDeps } from '../../deps';
import { bumpCatalogVersion } from '../../lib/catalog-version';
import { AppError, notFound } from '../../lib/errors';
import { availableStock, effectivePrice } from '../../lib/products';
import type { Redis } from '../../lib/redis';
import type { AuthUser } from '../../middleware/auth';
import { type CartOwner, createCartService } from '../cart/cart.service';
import { type CartLine, deleteCartLines } from '../cart/cart.store';
import { tryLock } from '../cart/redis-lock';
import { isOrderCode, newOrderCode } from './order-code';
import { type AppliedTransition, applyTransition, type Tx } from './orders.state';

export type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type OrderLine = Pick<CartLine, 'productId' | 'buildId' | 'qty'>;

export const holdKey = (code: string) => `hold:order:${code}`;
export const checkoutLockKey = (guestId: string) => `lock:checkout:${guestId}`;
const CHECKOUT_LOCK_MS = 10_000;

export interface Viewer {
  user?: AuthUser;
  guestId?: string;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toOrderDTO(o: OrderRow, items: OrderItemRow[]): OrderDTO {
  return {
    id: o.id,
    code: o.code,
    type: o.type,
    status: o.status,
    paymentStatus: o.paymentStatus,
    items: [...items]
      .sort(
        (a, b) =>
          (a.buildId ?? '').localeCompare(b.buildId ?? '') || a.nameSnapshot.localeCompare(b.nameSnapshot),
      )
      .map((i) => ({
        productId: i.productId,
        name: i.nameSnapshot,
        price: i.priceSnapshot,
        qty: i.qty,
        buildId: i.buildId,
      })),
    subtotal: o.subtotal,
    assemblyFee: o.assemblyFee,
    shippingFee: o.shippingFee,
    total: o.total,
    shippingName: o.shippingName,
    phone: o.phone,
    address: o.address,
    note: o.note,
    paidAt: iso(o.paidAt),
    expiresAt: iso(o.expiresAt),
    createdAt: o.createdAt.toISOString(),
  };
}

/**
 * Redis/cache work that follows a committed DB change. The DB is the source of truth, so a failure here is
 * logged and swallowed: it must never turn an order that already exists into an error response.
 */
export async function afterCommit(what: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[orders] post-commit step "${what}" failed; the committed change stands`, err);
  }
}

/** Post-commit bookkeeping for status changes: stop hold timers and invalidate catalog caches. */
export async function afterTransitions(redis: Redis, applied: AppliedTransition[]): Promise<void> {
  const holds = applied.filter((a) => a.from === 'PENDING_PAYMENT').map((a) => holdKey(a.code));
  if (holds.length > 0) await afterCommit('clear hold keys', () => redis.del(...holds));
  if (applied.some((a) => a.effect !== 'NONE'))
    await afterCommit('bump catalog version', () => bumpCatalogVersion(redis));
}

export interface OrderListFilter {
  status?: OrderStatus;
  type?: OrderType;
  q?: string;
  userId?: string;
  page: number;
  pageSize: number;
}

const emptyCart = (input: CheckoutInput) =>
  new AppError(400, 'EMPTY_CART', input.buildId ? 'Giỏ hàng không có cấu hình này' : 'Giỏ hàng đang trống');

function pickLines<T extends OrderLine>(all: T[], input: CheckoutInput): T[] {
  const lines = input.buildId ? all.filter((l) => l.buildId === input.buildId) : all;
  if (lines.length === 0) throw emptyCart(input);
  return lines;
}

export function createOrdersService(deps: AppDeps) {
  const { db, redis, env } = deps;
  const cart = createCartService(deps);

  async function withItems(rows: OrderRow[]): Promise<OrderDTO[]> {
    if (rows.length === 0) return [];
    const items = await db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((r) =>
      toOrderDTO(
        r,
        items.filter((i) => i.orderId === r.id),
      ),
    );
  }

  async function findByCode(code: string): Promise<OrderRow | null> {
    if (!isOrderCode(code)) return null;
    const [row] = await db.select().from(orders).where(eq(orders.code, code));
    return row ?? null;
  }

  function isOwner(order: OrderRow, viewer: Viewer): boolean {
    if (order.userId) return viewer.user?.id === order.userId;
    return order.guestId !== null && order.guestId === viewer.guestId;
  }

  const isStaff = (viewer: Viewer) => viewer.user?.role === 'STAFF' || viewer.user?.role === 'ADMIN';

  /**
   * Reserves stock and writes the order inside the caller's transaction. Each reservation is one
   * conditional UPDATE (`stock - reserved >= q`), so concurrent checkouts can never oversell; rows are
   * locked in product-id order so two carts with the same products cannot deadlock.
   */
  async function insertOrder(
    tx: Tx,
    lines: OrderLine[],
    input: CheckoutInput,
    who: { userId: string | null; guestId: string | null },
  ): Promise<OrderDTO> {
    const qtyByProduct = new Map<string, number>();
    for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.qty);
    const unitPrice = new Map<string, { name: string; price: number }>();
    for (const productId of [...qtyByProduct.keys()].sort()) {
      const q = qtyByProduct.get(productId)!;
      const [reserved] = await tx
        .update(products)
        .set({ reserved: sql`${products.reserved} + ${q}` })
        .where(
          and(
            eq(products.id, productId),
            eq(products.status, 'ACTIVE'),
            sql`${products.stock} - ${products.reserved} >= ${q}`,
          ),
        )
        .returning({ name: products.name, price: products.price, salePrice: products.salePrice });
      if (!reserved) {
        const [current] = await tx
          .select({
            name: products.name,
            stock: products.stock,
            reserved: products.reserved,
            status: products.status,
          })
          .from(products)
          .where(eq(products.id, productId));
        const available = current?.status === 'ACTIVE' ? availableStock(current) : 0;
        const name = current?.name ?? productId;
        throw new AppError(
          409,
          'OUT_OF_STOCK',
          `Sản phẩm "${name}" đã hết hàng hoặc không đủ số lượng (còn ${available})`,
          { productId, name, requested: q, available },
        );
      }
      unitPrice.set(productId, { name: reserved.name, price: effectivePrice(reserved) });
    }

    const now = deps.now();
    const isBuild = Boolean(input.buildId);
    const subtotal = lines.reduce((s, l) => s + unitPrice.get(l.productId)!.price * l.qty, 0);
    const assemblyFee = isBuild ? env.ASSEMBLY_FEE : 0;
    const shippingFee = 0;
    const [created] = await tx
      .insert(orders)
      .values({
        code: newOrderCode(),
        userId: who.userId,
        guestId: who.userId ? null : who.guestId,
        type: isBuild ? 'BUILD' : 'RETAIL',
        buildId: input.buildId ?? null,
        subtotal,
        assemblyFee,
        shippingFee,
        total: subtotal + assemblyFee + shippingFee,
        shippingName: input.shippingName,
        phone: input.phone,
        address: input.address,
        note: input.note ?? null,
        expiresAt: new Date(now.getTime() + env.ORDER_HOLD_MINUTES * 60_000),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const items = await tx
      .insert(orderItems)
      .values(
        lines.map((l) => ({
          orderId: created!.id,
          productId: l.productId,
          nameSnapshot: unitPrice.get(l.productId)!.name,
          priceSnapshot: unitPrice.get(l.productId)!.price,
          qty: l.qty,
          buildId: l.buildId,
        })),
      )
      .returning();
    return toOrderDTO(created!, items);
  }

  async function afterCheckout(order: OrderDTO, extra?: () => Promise<unknown>): Promise<void> {
    await afterCommit('set hold key', () =>
      redis.set(holdKey(order.code), order.id, 'EX', env.ORDER_HOLD_MINUTES * 60),
    );
    if (extra) await afterCommit('clear ordered cart lines', extra);
    await afterCommit('bump catalog version', () => bumpCatalogVersion(redis));
  }

  /** Account checkout: the carts row lock serialises double submits; the loser then finds an empty cart. */
  async function checkoutUserCart(userId: string, input: CheckoutInput): Promise<OrderDTO> {
    const order = await db.transaction(async (tx) => {
      const [cartRow] = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, userId))
        .for('update');
      if (!cartRow) throw emptyCart(input);
      const all = await tx
        .select({ productId: cartItems.productId, buildId: cartItems.buildId, qty: cartItems.qty })
        .from(cartItems)
        .where(eq(cartItems.cartId, cartRow.id));
      const lines = pickLines(all, input);
      const dto = await insertOrder(tx, lines, input, { userId, guestId: null });
      await deleteCartLines(tx, cartRow.id, lines);
      return dto;
    });
    await afterCheckout(order);
    return order;
  }

  /** Guest checkout: the Redis cart has no row to lock, so a short per-visitor lock rejects double submits. */
  async function checkoutGuestCart(
    owner: CartOwner & { guestId: string },
    input: CheckoutInput,
  ): Promise<OrderDTO> {
    const lock = await tryLock(redis, checkoutLockKey(owner.guestId), CHECKOUT_LOCK_MS);
    if (!lock) {
      throw new AppError(409, 'CHECKOUT_IN_PROGRESS', 'Đơn hàng đang được tạo, vui lòng chờ trong giây lát');
    }
    try {
      const lines = pickLines(await cart.lines(owner), input);
      const order = await db.transaction((tx) =>
        insertOrder(tx, lines, input, { userId: null, guestId: owner.guestId }),
      );
      await afterCheckout(order, () => cart.removeLines(owner, lines));
      return order;
    } finally {
      await lock.release();
    }
  }

  return {
    findByCode,
    toDTO: async (order: OrderRow) => (await withItems([order]))[0]!,

    /** Loads an order the viewer may see (owner, the guest who placed it, or staff); 404 otherwise. */
    async getVisible(code: string, viewer: Viewer): Promise<OrderRow> {
      const order = await findByCode(code);
      if (!order || !(isStaff(viewer) || isOwner(order, viewer))) throw notFound('Đơn hàng');
      return order;
    },

    async create(owner: CartOwner, input: CheckoutInput): Promise<OrderDTO> {
      if (owner.userId) {
        await cart.prepare(owner);
        return checkoutUserCart(owner.userId, input);
      }
      if (!owner.guestId) throw new AppError(400, 'NO_CART', 'Không xác định được giỏ hàng');
      return checkoutGuestCart({ ...owner, guestId: owner.guestId }, input);
    },

    async list(filter: OrderListFilter): Promise<Paginated<OrderDTO>> {
      const conds: SQL[] = [];
      if (filter.status) conds.push(eq(orders.status, filter.status));
      if (filter.type) conds.push(eq(orders.type, filter.type));
      if (filter.userId) conds.push(eq(orders.userId, filter.userId));
      if (filter.q) {
        const like = `%${filter.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
        conds.push(
          or(ilike(orders.code, like), ilike(orders.phone, like), ilike(orders.shippingName, like))!,
        );
      }
      const where = conds.length > 0 ? and(...conds) : undefined;
      const [rows, [{ total } = { total: 0 }]] = await Promise.all([
        db
          .select()
          .from(orders)
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(filter.pageSize)
          .offset((filter.page - 1) * filter.pageSize),
        db.select({ total: count() }).from(orders).where(where),
      ]);
      return { items: await withItems(rows), page: filter.page, pageSize: filter.pageSize, total };
    },

    /**
     * Moves an order along the state machine under a row lock. `guard` sees the locked row and may throw
     * (ownership or role checks that depend on the current status); `onApplied` writes extra rows in the
     * same transaction (e.g. a manual payment record).
     */
    async changeStatus(
      code: string,
      to: OrderStatus,
      opts: {
        actorId?: string | null;
        guard?: (order: OrderRow) => void;
        onApplied?: (tx: Tx, order: OrderRow, applied: AppliedTransition) => Promise<void>;
      } = {},
    ): Promise<OrderDTO> {
      if (!isOrderCode(code)) throw notFound('Đơn hàng');
      const applied = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.code, code)).for('update');
        if (!order) throw notFound('Đơn hàng');
        opts.guard?.(order);
        const done = await applyTransition(tx, order, to, { now: deps.now(), actorId: opts.actorId });
        if (done) await opts.onApplied?.(tx, order, done);
        return done;
      });
      if (applied) await afterTransitions(redis, [applied]);
      const order = await findByCode(code);
      return (await withItems([order!]))[0]!;
    },

    isOwner,
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
