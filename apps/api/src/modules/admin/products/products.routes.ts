import {
  adminProductCreateSchema,
  adminProductPatchSchema,
  CATEGORY_KEYS,
  categorySpecSchemaInput,
  PRODUCT_STATUSES,
} from '@pc/shared';
import { type Request, Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../../deps';
import { AppError } from '../../../lib/errors';
import { handler, parseBody, parseQuery } from '../../../lib/http';
import { adminOnly, idParam, pageQuery } from '../admin.shared';
import { createAdminProductsService } from './products.service';

const listQuery = pageQuery.extend({
  category: z.enum(CATEGORY_KEYS).optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  lowStock: z.stringbool().optional(),
});

/**
 * commercialBoost steers recommendations the way purpose weights do, so only ADMIN may set it. A new product may
 * still carry the neutral 0 that the admin form always sends.
 */
function assertMaySetBoost(req: Request, boost: number | undefined, allowNeutral: boolean): void {
  if (req.user?.role === 'ADMIN' || boost === undefined || (allowNeutral && boost === 0)) return;
  throw new AppError(403, 'FORBIDDEN_FIELD', 'Chỉ quản trị viên được chỉnh mức ưu tiên trong bộ máy gợi ý', {
    fields: ['commercialBoost'],
  });
}

export function createAdminProductsRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createAdminProductsService(deps);

  router.get(
    '/products',
    handler(async (req, res) => {
      res.json(await svc.list(parseQuery(listQuery, req)));
    }),
  );

  router.get(
    '/products/:id',
    handler(async (req, res) => {
      res.json(await svc.get(idParam(req.params.id, 'Sản phẩm')));
    }),
  );

  router.post(
    '/products',
    handler(async (req, res) => {
      const input = parseBody(adminProductCreateSchema, req);
      assertMaySetBoost(req, input.commercialBoost, true);
      res.status(201).json(await svc.create(input, req.user!.id));
    }),
  );

  router.patch(
    '/products/:id',
    handler(async (req, res) => {
      const id = idParam(req.params.id, 'Sản phẩm');
      const input = parseBody(adminProductPatchSchema, req);
      assertMaySetBoost(req, input.commercialBoost, false);
      res.json(await svc.update(id, input));
    }),
  );

  router.delete(
    '/products/:id',
    handler(async (req, res) => {
      res.json(await svc.hide(idParam(req.params.id, 'Sản phẩm')));
    }),
  );

  router.put(
    '/categories/:id/schema',
    adminOnly,
    handler(async (req, res) => {
      const id = idParam(req.params.id, 'Danh mục');
      res.json(await svc.setCategorySchema(id, parseBody(categorySpecSchemaInput, req)));
    }),
  );

  return router;
}
