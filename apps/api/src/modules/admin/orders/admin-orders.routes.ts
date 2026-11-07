import {
  type AdminOrderDetailDTO,
  type AdminPaymentDTO,
  ORDER_STATUSES,
  ORDER_TYPES,
  updateOrderStatusSchema,
} from '@pc/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { type orders, payments, users } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { AppError, notFound } from '../../../lib/errors';
import { handler, parseBody, parseQuery } from '../../../lib/http';
import { createOrdersService } from '../../orders';
import { pageQuery } from '../admin.shared';

const listQuery = pageQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  type: z.enum(ORDER_TYPES).optional(),
  q: z.string().trim().max(100).optional(),
});

export function toAdminPaymentDTO(p: typeof payments.$inferSelect, orderCode: string): AdminPaymentDTO {
  return {
    id: p.id,
    orderCode,
    provider: p.provider,
    amount: p.amount,
    transferContent: p.transferContent,
    providerTxnId: p.providerTxnId,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  };
}

export function createAdminOrdersRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createOrdersService(deps);

  router.get(
    '/orders',
    handler(async (req, res) => {
      res.json(await svc.list(parseQuery(listQuery, req)));
    }),
  );

  router.get(
    '/orders/:code',
    handler(async (req, res) => {
      const order = await svc.findByCode(String(req.params.code));
      if (!order) throw notFound('Đơn hàng');
      const [pays, [user]] = await Promise.all([
        deps.db
          .select()
          .from(payments)
          .where(eq(payments.orderId, order.id))
          .orderBy(desc(payments.createdAt)),
        order.userId
          ? deps.db.select({ email: users.email }).from(users).where(eq(users.id, order.userId))
          : Promise.resolve([]),
      ]);
      const detail: AdminOrderDetailDTO = {
        ...(await svc.toDTO(order)),
        userEmail: user?.email ?? null,
        payments: pays.map((p) => toAdminPaymentDTO(p, order.code)),
      };
      res.json(detail);
    }),
  );

  router.patch(
    '/orders/:code/status',
    handler(async (req, res) => {
      const { status } = parseBody(updateOrderStatusSchema, req);
      const actor = req.user!;
      res.json(
        await svc.changeStatus(String(req.params.code), status, {
          actorId: actor.id,
          guard: (order: typeof orders.$inferSelect) => {
            if (order.status === 'PAID' && status === 'CANCELLED' && actor.role !== 'ADMIN') {
              throw new AppError(
                403,
                'FORBIDDEN',
                'Chỉ quản trị viên được hủy đơn đã thanh toán (cần hoàn tiền)',
              );
            }
          },
        }),
      );
    }),
  );

  return router;
}
