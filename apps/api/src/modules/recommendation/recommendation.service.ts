import { type SolveStats, solve } from '@pc/engine';
import {
  type BuildDTO,
  type InfeasibleReason,
  type RecommendationRequest,
  recommendationRequestSchema,
} from '@pc/shared';
import type { Db } from '../../db/client';
import { getCatalogVersion } from '../../lib/catalog-version';
import type { Redis } from '../../lib/redis';
import { createBuildsService } from '../builds';
import { createCatalogService } from '../catalog';
import { loadPurposeProfile } from './profile';
import { isCacheable, RECOMMENDATION_TTL_SECONDS, recommendationCacheKey } from './recommendation.cache';

export interface RecommendMeta {
  /** FORM for the HTTP endpoint, CHAT for the chatbot tool. */
  source: 'CHAT' | 'FORM';
  userId?: string;
}

export interface RecommendResult {
  builds: BuildDTO[];
  stats: SolveStats;
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
  cache: 'HIT' | 'MISS';
}

interface CachedRecommendation {
  buildIds: string[];
  stats: SolveStats;
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
}

export function createRecommendationService(deps: { db: Db; redis: Redis }) {
  const { db, redis } = deps;
  const catalog = createCatalogService(deps);
  const buildsService = createBuildsService(deps);

  async function fromCache(key: string): Promise<RecommendResult | null> {
    const raw = await redis.get(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedRecommendation;
    const builds = await buildsService.getMany(cached.buildIds);
    if (builds.length !== cached.buildIds.length) return null;
    const { buildIds: _ids, ...rest } = cached;
    return { ...rest, builds, cache: 'HIT' };
  }

  return {
    /** Solves, persists every returned build with `meta.source`, and caches the build ids for identical requests. */
    async recommend(
      input: RecommendationRequest,
      meta: RecommendMeta = { source: 'FORM' },
    ): Promise<RecommendResult> {
      const req = recommendationRequestSchema.parse(input);
      const key = recommendationCacheKey(await getCatalogVersion(redis), req, meta);
      const hit = await fromCache(key);
      if (hit) return hit;

      const [engineCatalog, profile] = await Promise.all([
        catalog.getEngineCatalog(),
        loadPurposeProfile(db, req.purpose),
      ]);
      const result = solve(
        {
          budget: req.budget,
          purpose: req.purpose,
          preferences: req.preferences,
          fixed: req.fixed,
          exclude: req.exclude,
        },
        engineCatalog,
        profile,
      );
      const builds = await buildsService.saveMany(result.builds, {
        source: meta.source,
        userId: meta.userId,
        purpose: req.purpose,
        budget: req.budget,
      });

      const cached: CachedRecommendation = { buildIds: builds.map((b) => b.id), stats: result.stats };
      if (result.infeasibleReason) cached.infeasibleReason = result.infeasibleReason;
      if (result.minFeasibleBudget !== undefined) cached.minFeasibleBudget = result.minFeasibleBudget;
      if (isCacheable(result)) {
        await redis.set(key, JSON.stringify(cached), 'EX', RECOMMENDATION_TTL_SECONDS);
      }

      const { buildIds: _ids, ...rest } = cached;
      return { ...rest, builds, cache: 'MISS' };
    },
  };
}

export type RecommendationService = ReturnType<typeof createRecommendationService>;
