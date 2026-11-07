import { Router } from 'express';
import type { AppDeps } from './deps';
import { createAdminRouter } from './modules/admin';
import { createAuthRouter } from './modules/auth';
import { createBuildsRouter } from './modules/builds';
import { createCartRouter } from './modules/cart';
import { createCatalogRouter } from './modules/catalog';
import { createChatRouter } from './modules/chat';
import { createCompatibilityRouter } from './modules/compatibility';
import { createOrdersRouter } from './modules/orders';
import { createPaymentsRouter } from './modules/payments';
import { createQuotesRouter } from './modules/quotes';
import { createRecommendationRouter } from './modules/recommendation';

/**
 * Each module router owns its full sub-paths (e.g. catalog serves /categories and /products),
 * so routers are mounted at the API root rather than under a per-module prefix.
 */
export function createApiRouter(deps: AppDeps): Router {
  const api = Router();
  api.get('/health', async (_req, res) => {
    const [db, redis] = await Promise.all([
      deps.db.execute('select 1').then(
        () => 'up' as const,
        () => 'down' as const,
      ),
      deps.redis.ping().then(
        () => 'up' as const,
        () => 'down' as const,
      ),
    ]);
    const ok = db === 'up' && redis === 'up';
    res
      .status(ok ? 200 : 503)
      .json({ status: ok ? 'ok' : 'degraded', db, redis, ai: deps.llm ? 'gemini' : 'fallback' });
  });
  api.use(createAuthRouter(deps));
  api.use(createCatalogRouter(deps));
  api.use(createCompatibilityRouter(deps));
  api.use(createRecommendationRouter(deps));
  api.use(createBuildsRouter(deps));
  api.use(createCartRouter(deps));
  api.use(createOrdersRouter(deps));
  api.use(createPaymentsRouter(deps));
  api.use(createQuotesRouter(deps));
  api.use(createChatRouter(deps));
  api.use('/admin', createAdminRouter(deps));
  return api;
}
