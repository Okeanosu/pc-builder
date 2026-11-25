import { compatibilityCheckSchema, PURPOSES } from '@pc/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../deps';
import { handler, parseBody } from '../../lib/http';
import { createCompatibilityService } from './compatibility.service';

const checkBodySchema = compatibilityCheckSchema.extend({
  purpose: z.enum(PURPOSES).optional(),
  budget: z.number().int().positive().optional(),
});

export function createCompatibilityRouter(deps: AppDeps): Router {
  const router = Router();
  const compatibility = createCompatibilityService(deps);

  router.post(
    '/compatibility/check',
    handler(async (req, res) => {
      const { productIds, purpose, budget } = parseBody(checkBodySchema, req);
      res.json(await compatibility.check(productIds, { purpose, budget }));
    }),
  );

  return router;
}

export {
  type CheckContext,
  type CompatibilityService,
  createCompatibilityService,
  type LoadedParts,
  loadParts,
  referenceCatalog,
  toCompatibilityResult,
} from './compatibility.service';
