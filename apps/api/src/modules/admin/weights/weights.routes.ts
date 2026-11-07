import {
  CATEGORY_KEYS,
  type CategoryKey,
  PURPOSES,
  type Purpose,
  type PurposeWeightsDTO,
  purposeWeightsSchema,
} from '@pc/shared';
import { Router } from 'express';
import { purposeWeights } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { bumpCatalogVersion } from '../../../lib/catalog-version';
import { notFound } from '../../../lib/errors';
import { handler, parseBody } from '../../../lib/http';
import { deleteKeysByPattern } from '../../../lib/redis';
import { adminOnly, type FieldIssue, validationError } from '../admin.shared';

const SUM_TOLERANCE = 0.001;

function toDTO(row: typeof purposeWeights.$inferSelect): PurposeWeightsDTO {
  return {
    purpose: row.purpose as Purpose,
    weights: row.weights,
    allocation: row.allocation,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function weightIssues(
  weights: Record<CategoryKey, number>,
  allocation: Record<CategoryKey, { min: number; max: number }>,
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const sum = CATEGORY_KEYS.reduce((s, k) => s + weights[k], 0);
  if (Math.abs(sum - 1) > SUM_TOLERANCE) {
    issues.push({ path: 'weights', message: `Tổng trọng số phải bằng 1 (hiện tại ${sum.toFixed(3)})` });
  }
  for (const k of CATEGORY_KEYS) {
    if (allocation[k].min > allocation[k].max) {
      issues.push({ path: `allocation.${k}`, message: 'Tỷ lệ tối thiểu không được lớn hơn tối đa' });
    }
  }
  return issues;
}

export function createAdminWeightsRouter(deps: AppDeps): Router {
  const router = Router();

  router.get(
    '/weights',
    handler(async (_req, res) => {
      const rows = await deps.db.select().from(purposeWeights);
      const rank = (p: string) => PURPOSES.indexOf(p as Purpose);
      res.json(rows.sort((a, b) => rank(a.purpose) - rank(b.purpose)).map(toDTO));
    }),
  );

  router.put(
    '/weights/:purpose',
    adminOnly,
    handler(async (req, res) => {
      const purpose = String(req.params.purpose);
      if (!PURPOSES.includes(purpose as Purpose)) throw notFound('Nhu cầu');
      const { weights, allocation } = parseBody(purposeWeightsSchema, req);
      const issues = weightIssues(weights, allocation);
      if (issues.length > 0) throw validationError(issues);

      const values = { weights, allocation, updatedBy: req.user!.id, updatedAt: deps.now() };
      const [row] = await deps.db
        .insert(purposeWeights)
        .values({ purpose, ...values })
        .onConflictDoUpdate({ target: purposeWeights.purpose, set: values })
        .returning();
      await bumpCatalogVersion(deps.redis);
      // Version-keyed entries already stop being read; this also clears any key written without the version.
      await deleteKeysByPattern(deps.redis, 'cache:reco:*');
      res.json(toDTO(row!));
    }),
  );

  return router;
}
