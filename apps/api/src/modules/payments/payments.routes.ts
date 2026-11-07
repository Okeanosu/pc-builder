import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import { handler } from '../../lib/http';
import { createOrdersService } from '../orders';
import { createPaymentsService, isValidSepayAuth } from './payments.service';

const simulateSchema = z.object({ amount: z.number().int().nonnegative().optional() }).default({});

export function createPaymentsRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createPaymentsService(deps);
  const ordersSvc = createOrdersService(deps);

  router.get(
    '/orders/:code/payment',
    handler(async (req, res) => {
      const order = await ordersSvc.getVisible(String(req.params.code), req);
      res.json(svc.paymentInfo(order));
    }),
  );

  // Every authenticated call is acknowledged with 200 so SePay stops retrying business-level rejects.
  // Unexpected failures (e.g. DB down) still surface as 5xx: a retry is then wanted and is safe (idempotent).
  router.post(
    '/payments/webhook/sepay',
    handler(async (req, res) => {
      if (!isValidSepayAuth(req.headers.authorization, deps.env.SEPAY_API_KEY)) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sai API key');
      }
      const outcome = await svc.processTransfer(req.body, 'SEPAY');
      req.log?.info({ outcome, txn: req.body?.id }, 'sepay webhook');
      res.json({ success: true });
    }),
  );

  router.post(
    '/payments/:orderCode/simulate',
    handler(async (req, res) => {
      if (deps.env.NODE_ENV === 'production' && req.user?.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'Chỉ quản trị viên được giả lập thanh toán');
      }
      const order = await ordersSvc.findByCode(String(req.params.orderCode));
      if (!order) throw notFound('Đơn hàng');
      // A repeated click on the demo button must not log a stray transfer against a settled order.
      if (order.status !== 'PENDING_PAYMENT') return res.json(svc.paymentInfo(order));
      const { amount } = simulateSchema.parse(req.body ?? {});
      const now = deps.now();
      await svc.processTransfer(
        {
          id: `SIM-${order.code}-${now.getTime()}`,
          gateway: 'SIMULATOR',
          transactionDate: now.toISOString(),
          accountNumber: deps.env.VIETQR_ACCOUNT_NO,
          content: `${order.code} thanh toan don hang`,
          transferType: 'in',
          transferAmount: amount ?? order.total,
          referenceCode: 'SIMULATED',
        },
        'SIMULATOR',
      );
      res.json(svc.paymentInfo((await ordersSvc.findByCode(order.code))!));
    }),
  );

  return router;
}
