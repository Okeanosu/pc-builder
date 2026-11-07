import { checkoutSchema } from '@pc/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import { handler, parseBody, parseQuery } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { cartOwnerOf } from '../cart/cart.service';
import { createOrdersService } from './orders.service';

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export function createOrdersRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createOrdersService(deps);

  router.post(
    '/orders',
    handler(async (req, res) => {
      const input = parseBody(checkoutSchema, req);
      res.status(201).json(await svc.create(cartOwnerOf(req), input));
    }),
  );

  router.get(
    '/me/orders',
    requireAuth,
    handler(async (req, res) => {
      const { page, pageSize } = parseQuery(pageQuery, req);
      res.json(await svc.list({ userId: req.user!.id, page, pageSize }));
    }),
  );

  router.get(
    '/orders/:code',
    handler(async (req, res) => {
      const order = await svc.getVisible(String(req.params.code), req);
      res.json(await svc.toDTO(order));
    }),
  );

  router.post(
    '/orders/:code/cancel',
    handler(async (req, res) => {
      const code = String(req.params.code);
      const order = await svc.findByCode(code);
      if (!order || !(await svc.isOwner(order, req))) throw notFound('Đơn hàng');
      const dto = await svc.changeStatus(code, 'CANCELLED', {
        actorId: req.user?.id ?? null,
        guard: (locked) => {
          if (locked.status !== 'PENDING_PAYMENT') {
            throw new AppError(409, 'INVALID_TRANSITION', 'Chỉ có thể hủy đơn đang chờ thanh toán', {
              from: locked.status,
              to: 'CANCELLED',
            });
          }
        },
      });
      res.json(dto);
    }),
  );

  return router;
}
