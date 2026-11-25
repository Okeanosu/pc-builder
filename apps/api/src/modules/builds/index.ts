import { PURPOSES } from '@pc/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../deps';
import { notFound } from '../../lib/errors';
import { handler, parseBody } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { createBuildsService } from './builds.service';

const createBuildSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  purpose: z.enum(PURPOSES),
  budget: z.number().int().positive().optional(),
  productIds: z.array(z.string()).min(1).max(16),
});

export function createBuildsRouter(deps: AppDeps): Router {
  const router = Router();
  const buildsService = createBuildsService(deps);

  router.post(
    '/builds',
    handler(async (req, res) => {
      const input = parseBody(createBuildSchema, req);
      res.status(201).json(await buildsService.createCustom(input, req.user?.id));
    }),
  );

  router.get(
    '/builds/:id',
    handler(async (req, res) => {
      const build = await buildsService.get(String(req.params.id));
      if (!build) throw notFound('Cấu hình');
      res.json(build);
    }),
  );

  router.get(
    '/me/builds',
    requireAuth,
    handler(async (req, res) => {
      res.json(await buildsService.listByUser(req.user!.id));
    }),
  );

  return router;
}

export { type BuildRow, storedItems, toBuildDTO } from './builds.mapper';
export {
  type BuildsService,
  type CustomBuildInput,
  createBuildsService,
  type SaveBuildMeta,
} from './builds.service';
