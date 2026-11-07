import type { MainboardSpecs } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../test/fixtures/catalog';
import { syntheticCatalog } from '../test/fixtures/synthetic';
import { solve, solveWithOptions } from './solver';
import type { EngineProduct, SolveRequest, SolveResult, SolveStrategy } from './types';

const STRATEGIES: SolveStrategy[] = ['bruteforce', 'backtracking', 'forward-checking', 'full'];
const signature = (r: SolveResult) =>
  r.builds.map((b) => ({
    label: b.label,
    score: b.score,
    totalPrice: b.totalPrice,
    ids: Object.values(b.parts)
      .map((p) => p!.id)
      .sort(),
  }));

function runAll(req: SolveRequest, catalog: EngineProduct[]) {
  return Object.fromEntries(STRATEGIES.map((s) => [s, solve({ ...req, strategy: s }, catalog)])) as Record<
    SolveStrategy,
    SolveResult
  >;
}

describe('strategies on the fixture catalog', () => {
  const runs = runAll({ budget: 25_000_000, purpose: 'gaming' }, CATALOG);

  it('all four strategies return the same best score', () => {
    const best = runs.full.builds[0]!.score;
    for (const s of STRATEGIES) expect(runs[s].builds[0]!.score).toBe(best);
  });

  it('all four strategies return identical labelled builds (B&B labels match exhaustive search)', () => {
    for (const s of STRATEGIES) expect(signature(runs[s])).toEqual(signature(runs.full));
  });

  it('full explores fewer nodes than backtracking, which explores fewer than brute force', () => {
    expect(runs.full.stats.nodesExplored).toBeLessThan(runs.backtracking.stats.nodesExplored);
    expect(runs['forward-checking'].stats.nodesExplored).toBeLessThan(runs.backtracking.stats.nodesExplored);
    expect(runs.backtracking.stats.nodesExplored).toBeLessThan(runs.bruteforce.stats.nodesExplored);
  });

  it('attributes pruning to the technique that did it', () => {
    expect(runs.bruteforce.stats).toMatchObject({
      prunedByAc3: 0,
      prunedByForwardChecking: 0,
      prunedByBound: 0,
    });
    expect(runs.backtracking.stats).toMatchObject({
      prunedByAc3: 0,
      prunedByForwardChecking: 0,
      prunedByBound: 0,
    });
    expect(runs['forward-checking'].stats.prunedByForwardChecking).toBeGreaterThan(0);
    expect(runs['forward-checking'].stats.prunedByBound).toBe(0);
    expect(runs.full.stats.prunedByBound).toBeGreaterThan(0);
    expect(runs.full.stats.prunedByDominance).toBeGreaterThan(0);
    for (const s of STRATEGIES) {
      expect(runs[s].stats.strategy).toBe(s);
      expect(runs[s].stats.capped).toBe(false);
    }
  });

  it('full counts AC-3 removals when the stock makes values unsupported', () => {
    const am5Only = CATALOG.map((p) =>
      p.category === 'mainboard' && (p.specs as MainboardSpecs).socket !== 'AM5' ? { ...p, stock: 0 } : p,
    );
    const r = solve({ budget: 30_000_000, purpose: 'gaming' }, am5Only);
    expect(r.stats.prunedByAc3).toBeGreaterThan(0);
    expect(r.builds.every((b) => b.parts.cpu!.brand === 'AMD')).toBe(true);
  });
});

describe('strategies agree across purposes and preferences', () => {
  const cases: [string, SolveRequest][] = [
    ['office 12M', { budget: 12_000_000, purpose: 'office' }],
    ['ai 45M', { budget: 45_000_000, purpose: 'ai' }],
    ['graphics 30M white', { budget: 30_000_000, purpose: 'graphics', preferences: { color: 'white' } }],
    ['gaming 18M 1440p', { budget: 18_000_000, purpose: 'gaming', preferences: { resolution: '1440p' } }],
    ['gaming 25M fixed gpu', { budget: 25_000_000, purpose: 'gaming', fixed: { gpu: 'gpu-4060' } }],
  ];
  it.each(cases)('%s', (_name, req) => {
    const runs = runAll(req, CATALOG);
    expect(runs.full.builds.length).toBeGreaterThan(0);
    for (const s of STRATEGIES) expect(signature(runs[s])).toEqual(signature(runs.full));
  });
});

describe('strategies agree on random synthetic catalogs', () => {
  const seeds = [1, 2, 3, 4];
  it.each(seeds)('seed %i', (seed) => {
    const catalog = syntheticCatalog(40, seed);
    for (const req of [
      { budget: 20_000_000, purpose: 'gaming' },
      { budget: 35_000_000, purpose: 'ai' },
    ] satisfies SolveRequest[]) {
      const full = solve(req, catalog);
      const brute = solve({ ...req, strategy: 'bruteforce' }, catalog);
      const fc = solve({ ...req, strategy: 'forward-checking' }, catalog);
      expect(signature(brute)).toEqual(signature(full));
      expect(signature(fc)).toEqual(signature(full));
      expect(brute.infeasibleReason).toBe(full.infeasibleReason);
    }
  });
});

describe('variable ordering', () => {
  it('pure MRV (benchmark ablation) reaches the same builds as the default weighted order', () => {
    for (const req of [
      { budget: 25_000_000, purpose: 'gaming' },
      { budget: 12_000_000, purpose: 'office' },
    ] satisfies SolveRequest[]) {
      const weighted = solve(req, CATALOG);
      const mrv = solveWithOptions(req, CATALOG, undefined, { variableOrder: 'mrv' });
      expect(signature(mrv)).toEqual(signature(weighted));
    }
  });
});

describe('node limit', () => {
  it('caps brute force and reports it instead of hanging', () => {
    const r = solve(
      { budget: 25_000_000, purpose: 'gaming', strategy: 'bruteforce', nodeLimit: 5_000 },
      CATALOG,
    );
    expect(r.stats.capped).toBe(true);
    expect(r.stats.nodesExplored).toBeLessThanOrEqual(5_000);
    expect(r.infeasibleReason).toBe(r.builds.length === 0 ? 'SEARCH_LIMIT' : undefined);
  });

  it('caps backtracking and full search too, returning best-so-far builds', () => {
    for (const strategy of ['backtracking', 'forward-checking', 'full'] as const) {
      const r = solve({ budget: 25_000_000, purpose: 'gaming', strategy, nodeLimit: 200 }, CATALOG);
      expect(r.stats.capped).toBe(true);
      expect(r.stats.nodesExplored).toBeLessThanOrEqual(200);
      expect(r.infeasibleReason).toBe(r.builds.length === 0 ? 'SEARCH_LIMIT' : undefined);
    }
  });

  it("reports 'SEARCH_LIMIT' when a capped run found no build", () => {
    const r = solve({ budget: 25_000_000, purpose: 'gaming', nodeLimit: 1 }, CATALOG);
    expect(r.builds).toEqual([]);
    expect(r.infeasibleReason).toBe('SEARCH_LIMIT');
    expect(r.minFeasibleBudget).toBeUndefined();
  });

  // 5M gaming is proven infeasible in 6 nodes; the unbounded cheapest-build search needs more than 10.
  it('never reports a minFeasibleBudget from a capped diagnosis search', () => {
    const req: SolveRequest = { budget: 5_000_000, purpose: 'gaming' };
    expect(solve(req, CATALOG).minFeasibleBudget).toBe(12_820_000);
    const foundSome = solve({ ...req, nodeLimit: 10 }, CATALOG);
    expect(foundSome.stats.capped).toBe(false);
    expect(foundSome.infeasibleReason).toBe('BUDGET_TOO_LOW');
    expect(foundSome.minFeasibleBudget).toBeUndefined();
    const foundNone = solve({ ...req, nodeLimit: 6 }, CATALOG);
    expect(foundNone.infeasibleReason).toBe('SEARCH_LIMIT');
    expect(foundNone.minFeasibleBudget).toBeUndefined();
  });

  it('reports SEARCH_LIMIT when the fixed-part relaxation check is capped', () => {
    const req: SolveRequest = {
      budget: 60_000_000,
      purpose: 'gaming',
      fixed: { cpu: 'cpu-r5-7600', mainboard: 'mb-z790' },
    };
    expect(solve({ ...req, nodeLimit: 6 }, CATALOG).infeasibleReason).toBe('SEARCH_LIMIT');
    expect(solve(req, CATALOG).infeasibleReason).toBe('FIXED_PART_CONFLICT');
  });
});
