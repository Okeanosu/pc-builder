import type { BuildDTO, InfeasibleReason, Preferences, Purpose, RecommendationRequest } from '@pc/shared';
import type { Redis } from '../../../lib/redis';
import type { RecommendMeta } from '../../recommendation';
import {
  infeasibleText,
  joinNotes,
  type RecommendForModel,
  SEARCH_LIMIT_NOTE,
  summarizeBuild,
} from './shared';
import type { ToolContext, ToolResult } from './types';

export interface RecommendOutcome {
  builds: BuildDTO[];
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
}

export type RecommendFn = (req: RecommendationRequest, meta: RecommendMeta) => Promise<RecommendOutcome>;

/** The request a chat build was solved from, so modify_build can keep preferences the build row does not store. */
export interface StoredBuildRequest {
  budget: number;
  purpose: Purpose;
  preferences: Preferences;
}

export interface BuildRequestStore {
  get(buildId: string): Promise<StoredBuildRequest | null>;
  save(buildIds: string[], request: StoredBuildRequest): Promise<void>;
}

export const BUILD_REQUEST_TTL_SECONDS = 24 * 3600;
export const buildRequestKey = (buildId: string) => `chat:build-request:${buildId}`;

export function createBuildRequestStore(redis: Redis): BuildRequestStore {
  return {
    async get(buildId) {
      const raw = await redis.get(buildRequestKey(buildId));
      return raw ? (JSON.parse(raw) as StoredBuildRequest) : null;
    },
    async save(buildIds, request) {
      if (buildIds.length === 0) return;
      const value = JSON.stringify(request);
      const multi = redis.multi();
      for (const id of buildIds) multi.set(buildRequestKey(id), value, 'EX', BUILD_REQUEST_TTL_SECONDS);
      await multi.exec();
    },
  };
}

/** In-memory store for unit tests and scripts without Redis. */
export function memoryBuildRequestStore(): BuildRequestStore & { entries: Map<string, StoredBuildRequest> } {
  const entries = new Map<string, StoredBuildRequest>();
  return {
    entries,
    async get(id) {
      return entries.get(id) ?? null;
    },
    async save(ids, request) {
      for (const id of ids) entries.set(id, request);
    },
  };
}

export interface RunRecommendationDeps {
  recommend: RecommendFn;
  requests: BuildRequestStore;
}

/** Calls the recommendation service for the chatbot and shapes the outcome the same way for both build tools. */
export async function runRecommendation(
  deps: RunRecommendationDeps,
  req: RecommendationRequest,
  ctx: ToolContext,
  notes: Array<string | undefined>,
  extra: Pick<RecommendForModel, 'changedCategories'> = {},
): Promise<{ result: ToolResult; outcome: RecommendOutcome }> {
  const outcome = await deps.recommend(req, { source: 'CHAT', userId: ctx.userId });
  const buildIds = outcome.builds.map((b) => b.id);
  await deps.requests.save(buildIds, {
    budget: req.budget,
    purpose: req.purpose,
    preferences: req.preferences ?? {},
  });

  const searchLimited = outcome.infeasibleReason === 'SEARCH_LIMIT';
  const forModel: RecommendForModel = {
    budget: req.budget,
    purpose: req.purpose,
    builds: outcome.builds.map(summarizeBuild),
    ...extra,
    ...(outcome.builds.length === 0 && outcome.infeasibleReason
      ? { infeasibleReason: infeasibleText(outcome.infeasibleReason) }
      : {}),
    ...(outcome.builds.length === 0 && outcome.minFeasibleBudget !== undefined
      ? { minFeasibleBudget: outcome.minFeasibleBudget }
      : {}),
    ...joinNotes([...notes, searchLimited ? SEARCH_LIMIT_NOTE : undefined]),
  };
  return {
    outcome,
    result: {
      forModel: forModel as unknown as Record<string, unknown>,
      events: outcome.builds.length > 0 ? [{ type: 'builds', builds: outcome.builds }] : [],
      buildIds,
    },
  };
}
