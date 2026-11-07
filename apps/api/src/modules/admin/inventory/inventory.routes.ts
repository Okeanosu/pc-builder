import { benchmarkInputSchema, CATEGORY_KEYS, inventoryAdjustSchema } from '@pc/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../../deps';
import { handler, parseBody, parseQuery } from '../../../lib/http';
import { idParam, pageQuery } from '../admin.shared';
import { createAdminInventoryService } from './inventory.service';

const benchmarkListQuery = z.object({ category: z.enum(CATEGORY_KEYS).optional() });

export function createAdminInventoryRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createAdminInventoryService(deps);

  router.post(
    '/inventory/:productId/adjust',
    handler(async (req, res) => {
      const productId = idParam(req.params.productId, 'Sản phẩm');
      res.json(await svc.adjust(productId, parseBody(inventoryAdjustSchema, req), req.user!.id));
    }),
  );

  router.get(
    '/inventory/:productId/movements',
    handler(async (req, res) => {
      const productId = idParam(req.params.productId, 'Sản phẩm');
      const { page, pageSize } = parseQuery(pageQuery, req);
      res.json(await svc.movements(productId, page, pageSize));
    }),
  );

  router.get(
    '/benchmarks',
    handler(async (req, res) => {
      res.json(await svc.listBenchmarks(parseQuery(benchmarkListQuery, req).category));
    }),
  );

  router.get(
    '/benchmarks/:productId',
    handler(async (req, res) => {
      res.json(await svc.benchmarkOf(idParam(req.params.productId, 'Sản phẩm')));
    }),
  );

  router.put(
    '/benchmarks/:productId',
    handler(async (req, res) => {
      const productId = idParam(req.params.productId, 'Sản phẩm');
      res.json(await svc.putBenchmark(productId, parseBody(benchmarkInputSchema, req)));
    }),
  );

  return router;
}
