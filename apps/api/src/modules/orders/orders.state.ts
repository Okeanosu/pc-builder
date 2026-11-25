import { ORDER_STATUS_LABELS, type OrderStatus } from '@pc/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { inventoryMovements, orderItems, orders, products } from '../../db/schema';
import { AppError } from '../../lib/errors';

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from].includes(to);

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (canTransition(from, to)) return;
  throw new AppError(
    409,
    'INVALID_TRANSITION',
    `Không thể chuyển đơn từ "${ORDER_STATUS_LABELS[from]}" sang "${ORDER_STATUS_LABELS[to]}"`,
    { from, to },
  );
}

/**
 * RELEASE: drop the hold (unpaid order cancelled). COMMIT: payment turns the hold into a sale.
 * RESTOCK: a paid order is cancelled, so sold units go back on the shelf.
 */
export type InventoryEffect = 'RELEASE' | 'COMMIT' | 'RESTOCK' | 'NONE';

export function inventoryEffect(from: OrderStatus, to: OrderStatus): InventoryEffect {
  if (from === 'PENDING_PAYMENT' && to === 'CANCELLED') return 'RELEASE';
  if (from === 'PENDING_PAYMENT' && to === 'PAID') return 'COMMIT';
  if (from === 'PAID' && to === 'CANCELLED') return 'RESTOCK';
  return 'NONE';
}

export interface TransitionContext {
  now: Date;
  actorId?: string | null;
}

export interface AppliedTransition {
  code: string;
  from: OrderStatus;
  to: OrderStatus;
  effect: InventoryEffect;
}

/**
 * The only code path that changes an order's status. The UPDATE is guarded by the status the caller read,
 * so when two writers race (payment webhook vs. expiry sweeper) exactly one wins and the loser gets null.
 * Must run inside the caller's transaction so inventory side effects commit atomically with the status.
 */
export async function applyTransition(
  tx: Tx,
  order: { id: string; code: string; status: OrderStatus },
  to: OrderStatus,
  ctx: TransitionContext,
): Promise<AppliedTransition | null> {
  const from = order.status;
  assertTransition(from, to);
  const effect = inventoryEffect(from, to);

  const updated = await tx
    .update(orders)
    .set({
      status: to,
      updatedAt: ctx.now,
      ...(effect === 'COMMIT' ? { paymentStatus: 'PAID' as const, paidAt: ctx.now } : {}),
      ...(effect === 'RESTOCK' ? { paymentStatus: 'REFUNDED' as const } : {}),
    })
    .where(and(eq(orders.id, order.id), eq(orders.status, from)))
    .returning({ id: orders.id });
  if (updated.length === 0) return null;

  if (effect !== 'NONE') {
    const items = await tx
      .select({ productId: orderItems.productId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    // Same lock order as order creation (by product id) so concurrent transactions cannot deadlock.
    items.sort((a, b) => a.productId.localeCompare(b.productId));
    for (const { productId, qty } of items) {
      const change =
        effect === 'RELEASE'
          ? { reserved: sql`${products.reserved} - ${qty}` }
          : effect === 'COMMIT'
            ? { stock: sql`${products.stock} - ${qty}`, reserved: sql`${products.reserved} - ${qty}` }
            : { stock: sql`${products.stock} + ${qty}` };
      await tx.update(products).set(change).where(eq(products.id, productId));
      if (effect !== 'RELEASE') {
        await tx.insert(inventoryMovements).values({
          productId,
          delta: effect === 'COMMIT' ? -qty : qty,
          reason: effect === 'COMMIT' ? 'ORDER' : 'CANCEL',
          ref: order.code,
          actorId: ctx.actorId ?? null,
        });
      }
    }
  }
  return { code: order.code, from, to, effect };
}
