import { Router } from 'express';
import type { AppDeps } from '../../deps';

export function createRecommendationRouter(_deps: AppDeps): Router {
  const router = Router();
  return router;
}
