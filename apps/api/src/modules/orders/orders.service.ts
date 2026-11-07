import type { CheckoutInput, OrderDTO, OrderStatus, Paginated } from '@pc/shared';
import { and, count, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import { orderItems, orders, products } from '../../db/schema';
import type { AppDeps } from '../../deps';
import { bumpCatalogVersion } from '../../lib/catalog-version';
import { AppError, notFound } from '../../lib/errors';
import { availableStock, effectivePrice } from '../../lib/products';
import type { Redis } from '../../lib/redis';
import type { AuthUser } from '../../middleware/auth';
import { type CartOwner, createCartService } from '../cart/cart.service';
import { isOrderCode, newOrderCode } from './order-code';
import { type AppliedTransition, applyTransition } from './orders.state';

export type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

export const holdKey = (code: string) => `hold:order:${code}`;
/** Orders has no guest column, so the visitor that placed a guest order is remembered here. */
export const guestOrderKey = (code: string) => `order:guest:${code}`;
const GUEST_ORDER_TTL_SECONDS = 30 * 24 * 3600;

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

/** Post-commit bookkeeping for status changes: stop hold timers and invalidate catalog caches. */
export async function afterTransitions(redis: Redis, applied: AppliedTransition[]): Promise<void> {
  const holds = applied.filter((a) => a.from === 'PENDING_PAYMENT').map((a) => holdKey(a.code));
  if (holds.length > 0) await redis.del(...holds);
  if (applied.some((a) => a.effect !== 'NONE')) await bumpCatalogVersion(redis);
}

export interface OrderListFilter {
  status?: OrderStatus;
  q?: string;
  userId?: string;
  page: number;
  pageSize: number;
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

  async function isOwner(order: OrderRow, viewer: Viewer): Promise<boolean> {
    if (order.userId) return viewer.user?.id === order.userId;
    if (!viewer.guestId) return false;
    return (await redis.get(guestOrderKey(order.code))) === viewer.guestId;
  }

  const isStaff = (viewer: Viewer) => viewer.user?.role === 'STAFF' || viewer.user?.role === 'ADMIN';

  return {
    findByCode,
    toDTO: async (order: OrderRow) => (await withItems([order]))[0]!,

    /** Loads an order the viewer may see (owner, the guest who placed it, or staff); 404 otherwise. */
    async getVisible(code: string, viewer: Viewer): Promise<OrderRow> {
      const order = await findByCode(code);
      if (!order || !(isStaff(viewer) || (await isOwner(order, viewer)))) throw notFound('Đơn hàng');
      return order;
    },

    async create(owner: CartOwner, input: CheckoutInput): Promise<OrderDTO> {
      const all = await cart.lines(owner);
      const lines = input.buildId ? all.filter((l) => l.buildId === input.buildId) : all;
      if (lines.length === 0) {
        throw new AppError(
          400,
          'EMPTY_CART',
          input.buildId ? 'Giỏ hàng không có cấu hình này' : 'Giỏ hàng đang trống',
        );
      }
      const qtyByProduct = new Map<string, number>();
      for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.qty);
      const nameOf = new Map(lines.map((l) => [l.productId, l.row.product.name]));

      const now = deps.now();
      const code = newOrderCode();
      const isBuild = Boolean(input.buildId);

      const order = await db.transaction(async (tx) => {
        const unitPrice = new Map<string, { name: string; price: number }>();
        // Lock rows in a fixed (id) order so two carts with the same products cannot deadlock.
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
              .select({ stock: products.stock, reserved: products.reserved, status: products.status })
              .from(products)
              .where(eq(products.id, productId));
            const available = current && current.status === 'ACTIVE' ? availableStock(current) : 0;
            const name = nameOf.get(productId) ?? productId;
            throw new AppError(
              409,
              'OUT_OF_STOCK',
              `Sản phẩm "${name}" đã hết hàng hoặc không đủ số lượng (còn ${available})`,
              { productId, name, requested: q, available },
            );
          }
          unitPrice.set(productId, { name: reserved.name, price: effectivePrice(reserved) });
        }

        const subtotal = lines.reduce((s, l) => s + unitPrice.get(l.productId)!.price * l.qty, 0);
        const assemblyFee = isBuild ? env.ASSEMBLY_FEE : 0;
        const shippingFee = 0;
        const [created] = await tx
          .insert(orders)
          .values({
            code,
            userId: owner.userId ?? null,
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
      });

      await redis.set(holdKey(code), order.id, 'EX', env.ORDER_HOLD_MINUTES * 60);
      if (!owner.userId && owner.guestId) {
        await redis.set(guestOrderKey(code), owner.guestId, 'EX', GUEST_ORDER_TTL_SECONDS);
      }
      await cart.removeLines(owner, lines);
      await bumpCatalogVersion(redis);
      return order;
    },

    async list(filter: OrderListFilter): Promise<Paginated<OrderDTO>> {
      const conds: SQL[] = [];
      if (filter.status) conds.push(eq(orders.status, filter.status));
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
     * (e.g. ownership or role checks that depend on the current status).
     */
    async changeStatus(
      code: string,
      to: OrderStatus,
      opts: { actorId?: string | null; guard?: (order: OrderRow) => void } = {},
    ): Promise<OrderDTO> {
      if (!isOrderCode(code)) throw notFound('Đơn hàng');
      const applied = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.code, code)).for('update');
        if (!order) throw notFound('Đơn hàng');
        opts.guard?.(order);
        return applyTransition(tx, order, to, { now: deps.now(), actorId: opts.actorId });
      });
      if (applied) await afterTransitions(redis, [applied]);
      const order = await findByCode(code);
      return (await withItems([order!]))[0]!;
    },

    isOwner,
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
