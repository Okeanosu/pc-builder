import type { Purpose } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../test/fixtures/catalog';
import { syntheticCatalog } from '../test/fixtures/synthetic';
import { solve } from './solver';
import type { EngineProduct, SolveRequest, SolveResult } from './types';

const ORDER = ['performance', 'balanced', 'budget'];

/** Label contract: roles are kept, never re-derived from a score sort. Scores are rounded to 0.01 in builds. */
function expectLabelContract(r: SolveResult, context: string) {
  const labels = r.builds.map((b) => b.label);
  expect(labels, context).toEqual(ORDER.filter((l) => labels.includes(l as never)));
  const by = Object.fromEntries(r.builds.map((b) => [b.label, b]));
  const perf = by.performance;
  if (!perf) {
    expect(r.builds, context).toEqual([]);
    return;
  }
  for (const b of r.builds) expect(perf.score, context).toBeGreaterThanOrEqual(b.score);
  if (by.balanced) expect(by.balanced.totalPrice, context).toBeLessThanOrEqual(perf.totalPrice);
  if (by.budget) {
    expect(by.budget.totalPrice, context).toBeLessThanOrEqual(perf.totalPrice);
    if (by.balanced) expect(by.budget.totalPrice, context).toBeLessThanOrEqual(by.balanced.totalPrice);
    expect(by.budget.score, context).toBeGreaterThanOrEqual(0.85 * perf.score - 0.01);
  }
}

describe('label contract', () => {
  it('holds for the reported regressions (fill labelled budget while pricier / below 85%)', () => {
    const cases: [EngineProduct[], SolveRequest][] = [
      [syntheticCatalog(250, 10), { budget: 12_000_000, purpose: 'gaming' }],
      [syntheticCatalog(100, 5), { budget: 12_000_000, purpose: 'office' }],
    ];
    for (const [catalog, req] of cases) expectLabelContract(solve(req, catalog), JSON.stringify(req));
  });

  it('holds on the fixture with fixed parts and preferences', () => {
    const requests: SolveRequest[] = [
      { budget: 25_000_000, purpose: 'gaming' },
      { budget: 12_000_000, purpose: 'office' },
      { budget: 25_000_000, purpose: 'gaming', fixed: { cpu: 'cpu-r5-7600', mainboard: 'mb-b650m-white' } },
      { budget: 25_000_000, purpose: 'gaming', fixed: { gpu: 'gpu-4060' }, preferences: { color: 'white' } },
      { budget: 18_000_000, purpose: 'graphics', preferences: { cpuBrand: 'Intel', minRamGB: 32 } },
      { budget: 45_000_000, purpose: 'ai', preferences: { resolution: '4k', needWifi: true } },
    ];
    for (const req of requests) expectLabelContract(solve(req, CATALOG), JSON.stringify(req));
  });

  it('holds across random synthetic catalogs, purposes, budgets, fixed parts and preferences', () => {
    const purposes: Purpose[] = ['gaming', 'graphics', 'ai', 'office'];
    for (const seed of [1, 2, 3, 5, 8, 10]) {
      const catalog = syntheticCatalog(seed % 2 === 0 ? 100 : 60, seed);
      const someCpu = catalog.find((p) => p.category === 'cpu' && p.stock > 0)!.id;
      for (const purpose of purposes) {
        for (const budget of [10e6, 16e6, 28e6, 50e6]) {
          const variants: SolveRequest[] = [
            { budget, purpose },
            { budget, purpose, fixed: { cpu: someCpu } },
            { budget, purpose, preferences: { color: 'white', formFactor: 'mATX' } },
          ];
          for (const req of variants) {
            expectLabelContract(solve(req, catalog), `seed ${seed} ${JSON.stringify(req)}`);
          }
        }
      }
    }
  });

  it('exhaustive strategies obey the same contract', () => {
    const catalog = syntheticCatalog(40, 3);
    for (const req of [
      { budget: 14e6, purpose: 'office' },
      { budget: 22e6, purpose: 'gaming', strategy: 'forward-checking' },
    ] satisfies SolveRequest[]) {
      expectLabelContract(solve({ ...req, strategy: 'forward-checking' }, catalog), JSON.stringify(req));
    }
  });
});
