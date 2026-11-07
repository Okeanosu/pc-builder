import { Router } from 'express';
import type { AppDeps } from '../../deps';

export function createPaymentsRouter(_deps: AppDeps): Router {
  const router = Router();
  return router;
}
