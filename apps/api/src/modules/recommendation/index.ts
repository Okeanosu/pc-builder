import { recommendationRequestSchema } from '@pc/shared';
import { Router } from 'express';
import type { AppDeps } from '../../deps';
import { handler, parseBody } from '../../lib/http';
import { recommendationRateLimit } from './recommendation.rate-limit';
import { createRecommendationService } from './recommendation.service';

export function createRecommendationRouter(deps: AppDeps): Router {
  const router = Router();
  const recommendation = createRecommendationService(deps);

  router.post(
    '/recommendations',
    recommendationRateLimit(deps.redis),
    handler(async (req, res) => {
      const body = parseBody(recommendationRequestSchema, req);
      const { cache, ...result } = await recommendation.recommend(body, {
        source: 'FORM',
        userId: req.user?.id,
      });
      res.set('X-Cache', cache).json(result);
    }),
  );

  return router;
}

export { loadPurposeProfile } from './profile';
export {
  canonicalRequest,
  isCacheable,
  RECOMMENDATION_TTL_SECONDS,
  recommendationCacheKey,
} from './recommendation.cache';
export { RECOMMENDATION_IP_RATE_LIMIT, RECOMMENDATION_RATE_LIMIT } from './recommendation.rate-limit';
export {
  createRecommendationService,
  type RecommendationService,
  type RecommendMeta,
  type RecommendResult,
} from './recommendation.service';
