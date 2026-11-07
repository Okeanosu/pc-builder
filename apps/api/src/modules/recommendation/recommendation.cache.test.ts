import { describe, expect, it } from 'vitest';
import { canonicalRequest, isCacheable, recommendationCacheKey } from './recommendation.cache';

describe('canonicalRequest', () => {
  it('ignores key order, undefined fields, empty containers and exclude order', () => {
    const a = canonicalRequest({
      purpose: 'gaming',
      budget: 25_000_000,
      preferences: { gpuBrand: 'NVIDIA', cpuBrand: 'AMD', color: undefined },
      exclude: ['b', 'a', 'b'],
      fixed: {},
    });
    const b = canonicalRequest({
      budget: 25_000_000,
      exclude: ['a', 'b'],
      preferences: { cpuBrand: 'AMD', gpuBrand: 'NVIDIA' },
      purpose: 'gaming',
    });
    expect(a).toBe(b);
    expect(a).toBe(
      '{"budget":25000000,"exclude":["a","b"],"preferences":{"cpuBrand":"AMD","gpuBrand":"NVIDIA"},"purpose":"gaming"}',
    );
  });

  it('keeps meaningful differences apart', () => {
    const base = { budget: 25_000_000, purpose: 'gaming' as const };
    expect(canonicalRequest(base)).not.toBe(canonicalRequest({ ...base, budget: 25_000_001 }));
    expect(canonicalRequest(base)).not.toBe(canonicalRequest({ ...base, preferences: { needWifi: true } }));
  });
});

describe('recommendationCacheKey', () => {
  const req = { budget: 25_000_000, purpose: 'gaming' as const };

  it('is cache:reco:v{catalogVersion}:{sha1}', () => {
    expect(recommendationCacheKey(7, req, { source: 'FORM' })).toMatch(/^cache:reco:v7:[0-9a-f]{40}$/);
  });

  it('changes with the catalog version, the build source and the owner', () => {
    const key = recommendationCacheKey(1, req, { source: 'FORM' });
    expect(recommendationCacheKey(1, { purpose: 'gaming', budget: 25_000_000 }, { source: 'FORM' })).toBe(
      key,
    );
    expect(recommendationCacheKey(2, req, { source: 'FORM' })).not.toBe(key);
    expect(recommendationCacheKey(1, req, { source: 'CHAT' })).not.toBe(key);
    expect(recommendationCacheKey(1, req, { source: 'FORM', userId: 'u1' })).not.toBe(key);
  });
});

describe('isCacheable', () => {
  const stats = { capped: false };

  it('caches feasible results and genuine infeasibility', () => {
    expect(isCacheable({ builds: [{}], stats })).toBe(true);
    expect(isCacheable({ builds: [], stats, infeasibleReason: 'BUDGET_TOO_LOW' })).toBe(true);
    expect(isCacheable({ builds: [{}], stats: { capped: true } })).toBe(true);
  });

  it('does not cache outcomes cut short by the search limit', () => {
    expect(isCacheable({ builds: [], stats, infeasibleReason: 'SEARCH_LIMIT' })).toBe(false);
    expect(isCacheable({ builds: [], stats: { capped: true } })).toBe(false);
  });
});
