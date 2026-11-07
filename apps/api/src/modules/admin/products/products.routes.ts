import {
  adminProductCreateSchema,
  adminProductPatchSchema,
  CATEGORY_KEYS,
  categorySpecSchemaInput,
  PRODUCT_STATUSES,
} from '@pc/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../../deps';
import { handler, parseBody, parseQuery } from '../../../lib/http';
import { adminOnly, idParam, pageQuery } from '../admin.shared';
import { createAdminProductsService } from './products.service';

const listQuery = pageQuery.extend({
  category: z.enum(CATEGORY_KEYS).optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  lowStock: z.stringbool().optional(),
});

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
      res.status(201).json(await svc.create(parseBody(adminProductCreateSchema, req), req.user!.id));
    }),
  );

  router.patch(
    '/products/:id',
    handler(async (req, res) => {
      const id = idParam(req.params.id, 'Sản phẩm');
      res.json(await svc.update(id, parseBody(adminProductPatchSchema, req)));
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
