import { Router } from 'express';
import type { AppDeps } from '../../deps';

export function createBuildsRouter(_deps: AppDeps): Router {
  const router = Router();
  return router;
}
