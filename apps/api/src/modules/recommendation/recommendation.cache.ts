import { createHash } from 'node:crypto';
import type { BuildSource, RecommendationRequest } from '@pc/shared';

export const RECOMMENDATION_TTL_SECONDS = 600;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const v = canonical(value[key]);
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (isPlainObject(v) && Object.keys(v).length === 0) continue;
    out[key] = v;
  }
  return out;
}

/** Stable JSON for semantically equal requests: sorted keys, no empty/undefined fields, sorted unique excludes. */
export function canonicalRequest(req: RecommendationRequest): string {
  const exclude = req.exclude ? [...new Set(req.exclude)].sort() : undefined;
  return JSON.stringify(canonical({ ...req, exclude }));
}

export interface CacheOwner {
  source: BuildSource;
  userId?: string;
}

/**
 * Cached results point at persisted builds, so the build source and owner are part of the key: a hit then
 * returns builds that really belong to the caller.
 */
export function recommendationCacheKey(
  catalogVersion: number,
  req: RecommendationRequest,
  owner: CacheOwner,
): string {
  const material = JSON.stringify({
    request: canonicalRequest(req),
    source: owner.source,
    owner: owner.userId ?? null,
  });
  const hash = createHash('sha1').update(material).digest('hex');
  return `cache:reco:v${catalogVersion}:${hash}`;
}
