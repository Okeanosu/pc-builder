import { Router } from 'express';
import type { AppDeps } from '../../deps';
import { notFound } from '../../lib/errors';
import { handler } from '../../lib/http';
import { catalogQuerySchema, nestBracketParams } from './catalog.filters';
import { createCatalogService } from './catalog.service';

export function createCatalogRouter(deps: AppDeps): Router {
  const router = Router();
  const catalog = createCatalogService(deps);

  router.get(
    '/categories',
    handler(async (_req, res) => {
      res.json(await catalog.listCategories());
    }),
  );

  router.get(
    '/categories/:key/facets',
    handler(async (req, res) => {
      const facets = await catalog.getFacets(String(req.params.key));
      if (!facets) throw notFound('Danh mục');
      res.json(facets);
    }),
  );

  router.get(
    '/products',
    handler(async (req, res) => {
      const query = catalogQuerySchema.parse(nestBracketParams(req.query as Record<string, unknown>));
      res.json(await catalog.search(query));
    }),
  );

  router.get(
    '/products/:slugOrId',
    handler(async (req, res) => {
      const product = await catalog.getBySlugOrId(String(req.params.slugOrId));
      if (!product) throw notFound('Sản phẩm');
      res.json(product);
    }),
  );

  return router;
}

export { type CatalogQuery, catalogQuerySchema } from './catalog.filters';
export { type CatalogService, createCatalogService, isUuid } from './catalog.service';
