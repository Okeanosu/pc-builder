import { Router } from 'express';
import type { AppDeps } from '../../deps';
import { requireRole } from '../../middleware/auth';
import { createAdminChatsRouter } from './chats/chats.routes';
import { createAdminInventoryRouter } from './inventory/inventory.routes';
import { createAdminOrdersRouter } from './orders/admin-orders.routes';
import { createAdminProductsRouter } from './products/products.routes';
import { createAdminStatsRouter } from './stats/stats.routes';
import { createAdminWeightsRouter } from './weights/weights.routes';

/** Mounted at /api/admin; every route needs STAFF or ADMIN, a few narrow that to ADMIN. */
export function createAdminRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireRole('STAFF', 'ADMIN'));
  router.use(createAdminProductsRouter(deps));
  router.use(createAdminInventoryRouter(deps));
  router.use(createAdminWeightsRouter(deps));
  router.use(createAdminOrdersRouter(deps));
  router.use(createAdminStatsRouter(deps));
  router.use(createAdminChatsRouter(deps));
  return router;
}
