import type { CpuSpecs, GpuSpecs, MainboardSpecs, RamSpecs, StorageSpecs } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { byId, CATALOG, variant } from '../test/fixtures/catalog';
import { checkCompatibility } from './compatibility';
import { DEFAULT_PROFILES } from './profiles';
import { scoreProduct } from './scoring';
import { solve } from './solver';
import type { Build, EngineProduct, SolveRequest, SolveResult } from './types';

const GAMING_25M: SolveRequest = { budget: 25_000_000, purpose: 'gaming' };
const withoutTime = (r: SolveResult) => ({ ...r, stats: { ...r.stats, timeMs: 0 } });
const partIds = (b: Build) =>
  Object.entries(b.parts)
    .map(([c, p]) => `${c}:${p?.id}`)
    .sort();

function expectValidBuilds(result: SolveResult, req: SolveRequest) {
  expect(result.infeasibleReason).toBeUndefined();
  for (const b of result.builds) {
    const report = checkCompatibility(b.parts, {
      purpose: req.purpose,
      budget: req.budget,
      catalog: CATALOG,
    });
    expect(report.issues.filter((i) => i.severity === 'error')).toEqual([]);
    const expected = report.issues.filter((i) => b.label === 'performance' || i.code !== 'C14');
    expect(b.warnings).toEqual(expected);
    expect(b.totalPrice).toBeLessThanOrEqual(req.budget);
    expect(b.totalPrice).toBe(Object.values(b.parts).reduce((s, p) => s + (p?.price ?? 0), 0));
    expect(b.estimatedWattage).toBe(report.estimatedWattage);
    expect(b.recommendedPsuWattage).toBe(report.recommendedPsuWattage);
    for (const p of Object.values(b.parts)) expect(p!.stock).toBeGreaterThan(0);
  }
  for (let i = 0; i < result.builds.length; i++) {
    for (let j = i + 1; j < result.builds.length; j++) {
      const a = result.builds[i]!.parts;
      const b = result.builds[j]!.parts;
      expect(a.cpu?.id !== b.cpu?.id || a.gpu?.id !== b.gpu?.id).toBe(true);
    }
  }
}

describe('solve — 25,000,000₫ gaming', () => {
  const result = solve(GAMING_25M, CATALOG);
  const [performance, balanced, budget] = result.builds;

  it('returns three labelled, compatible, in-budget builds that differ by CPU or GPU', () => {
    expect(result.builds.map((b) => b.label)).toEqual(['performance', 'balanced', 'budget']);
    expectValidBuilds(result, GAMING_25M);
  });

  it('orders the labels: performance ≥ balanced ≥ budget in score, budget is cheapest', () => {
    expect(performance!.score).toBeGreaterThanOrEqual(balanced!.score);
    expect(balanced!.score).toBeGreaterThanOrEqual(budget!.score);
    expect(budget!.totalPrice).toBeLessThanOrEqual(balanced!.totalPrice);
    expect(budget!.score).toBeGreaterThanOrEqual(0.85 * performance!.score - 0.01);
  });

  it('fills all eight slots with per-category breakdown and price allocation', () => {
    for (const b of result.builds) {
      expect(Object.keys(b.parts).sort()).toEqual(
        ['case', 'cooler', 'cpu', 'gpu', 'mainboard', 'psu', 'ram', 'storage'].sort(),
      );
      const shares = Object.values(b.allocation);
      expect(shares.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 3);
      for (const s of Object.values(b.scoreBreakdown)) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
      expect(Object.keys(b.scoreBreakdown)).toHaveLength(8);
    }
  });

  it('reports search statistics', () => {
    expect(result.stats.strategy).toBe('full');
    expect(result.stats.nodesExplored).toBeGreaterThan(0);
    expect(result.stats.prunedByBound).toBeGreaterThan(0);
    expect(result.stats.timeMs).toBeGreaterThanOrEqual(0);
    expect(result.stats.capped).toBe(false);
  });

  it('is deterministic (two runs deep-equal except timeMs) and independent of catalog order', () => {
    expect(withoutTime(solve(GAMING_25M, CATALOG))).toEqual(withoutTime(result));
    const shuffled = [...CATALOG].reverse();
    expect(solve(GAMING_25M, shuffled).builds.map(partIds)).toEqual(result.builds.map(partIds));
  });

  it('never uses out-of-stock products', () => {
    for (const b of result.builds) expect(b.parts.gpu?.id).not.toBe('gpu-4070s-oos');
  });
});

describe('solve — preferences, fixed and exclude', () => {
  it("cpuBrand 'AMD' → every CPU is AMD", () => {
    const req: SolveRequest = { ...GAMING_25M, preferences: { cpuBrand: 'AMD' } };
    const result = solve(req, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    expectValidBuilds(result, req);
    for (const b of result.builds) expect(b.parts.cpu?.brand).toBe('AMD');
  });

  it("gpuBrand 'AMD' → every GPU chipset is AMD", () => {
    const req: SolveRequest = { ...GAMING_25M, preferences: { gpuBrand: 'AMD' } };
    const result = solve(req, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    for (const b of result.builds) expect((b.parts.gpu!.specs as GpuSpecs).chipsetBrand).toBe('AMD');
  });

  it("fixed.gpu = 'gpu-4060' → every build contains it (and builds differ by CPU)", () => {
    const req: SolveRequest = { ...GAMING_25M, fixed: { gpu: 'gpu-4060' } };
    const result = solve(req, CATALOG);
    expect(result.builds).toHaveLength(3);
    expectValidBuilds(result, req);
    for (const b of result.builds) expect(b.parts.gpu?.id).toBe('gpu-4060');
  });

  it('exclude is respected', () => {
    const first = solve(GAMING_25M, CATALOG).builds[0]!;
    const banned = [first.parts.gpu!.id, first.parts.case!.id];
    const result = solve({ ...GAMING_25M, exclude: banned }, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    for (const b of result.builds) {
      for (const p of Object.values(b.parts)) expect(banned).not.toContain(p!.id);
    }
  });

  it('honours hard filters: formFactor, needWifi, minRamGB, minStorageGB', () => {
    const req: SolveRequest = {
      budget: 40_000_000,
      purpose: 'graphics',
      preferences: { formFactor: 'mATX', needWifi: true, minRamGB: 32, minStorageGB: 1000 },
    };
    const result = solve(req, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    expectValidBuilds(result, req);
    for (const b of result.builds) {
      const board = b.parts.mainboard!.specs as MainboardSpecs;
      expect(board.formFactor).toBe('mATX');
      expect(board.wifi).toBe(true);
      expect((b.parts.ram!.specs as RamSpecs).capacityGB).toBeGreaterThanOrEqual(32);
      expect((b.parts.storage!.specs as StorageSpecs).capacityGB).toBeGreaterThanOrEqual(1000);
    }
  });

  it('colour is a soft preference: white raises the number of white parts but filters nothing', () => {
    const whiteParts = (r: SolveResult) =>
      r.builds
        .flatMap((b) => Object.values(b.parts))
        .filter((p) => (p!.specs as { color?: string }).color === 'white').length;
    const plain = solve(GAMING_25M, CATALOG);
    const white = solve({ ...GAMING_25M, preferences: { color: 'white' } }, CATALOG);
    expect(white.builds).toHaveLength(3);
    expect(whiteParts(white)).toBeGreaterThan(whiteParts(plain));
  });

  it('4k resolution shifts the performance build toward a stronger GPU', () => {
    const gpuScore = (r: SolveResult) => r.builds[0]!.parts.gpu!.benchmark!.gpuScore!;
    const fhd = solve({ ...GAMING_25M, preferences: { resolution: '1080p' } }, CATALOG);
    const uhd = solve({ ...GAMING_25M, preferences: { resolution: '4k' } }, CATALOG);
    expect(gpuScore(uhd)).toBeGreaterThanOrEqual(gpuScore(fhd));
  });

  it('commercialBoost nudges the score of builds containing the boosted product', () => {
    const before = solve(GAMING_25M, CATALOG).builds[0]!;
    const boostedId = before.parts.gpu!.id;
    const boosted: EngineProduct[] = CATALOG.map((p) =>
      p.id === boostedId ? { ...p, commercialBoost: 1 } : p,
    );
    const after = solve(GAMING_25M, boosted).builds[0]!;
    expect(after.score).toBeGreaterThanOrEqual(
      before.score + DEFAULT_PROFILES.gaming.weights.gpu * 5 - 0.011,
    );
  });

  it('accepts a custom purpose profile (admin-edited weights)', () => {
    const gpuHeavy = {
      ...DEFAULT_PROFILES.gaming,
      weights: {
        gpu: 0.93,
        cpu: 0.01,
        ram: 0.01,
        storage: 0.01,
        mainboard: 0.01,
        psu: 0.01,
        case: 0.01,
        cooler: 0.01,
      },
    };
    const result = solve({ ...GAMING_25M, budget: 30_000_000 }, CATALOG, gpuHeavy);
    expect(result.builds[0]!.parts.gpu!.id).toBe('gpu-4070');
  });
});

describe('solve — office and topK', () => {
  const office: SolveRequest = { budget: 12_000_000, purpose: 'office' };

  it('office builds may skip the GPU, but only on an iGPU cpu', () => {
    const result = solve(office, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    expectValidBuilds(result, office);
    expect(result.builds.some((b) => !b.parts.gpu)).toBe(true);
    for (const b of result.builds) {
      if (!b.parts.gpu) expect((b.parts.cpu!.specs as CpuSpecs).integratedGraphics).toBe(true);
      if (!b.parts.gpu) expect(b.scoreBreakdown.gpu).toBeUndefined();
    }
  });

  it('requireDiscreteGpu forces a GPU even for office', () => {
    const result = solve(
      { ...office, budget: 15_000_000, preferences: { requireDiscreteGpu: true } },
      CATALOG,
    );
    expect(result.builds.length).toBeGreaterThan(0);
    for (const b of result.builds) expect(b.parts.gpu).toBeDefined();
  });

  it('topK limits the number of builds, keeping label order', () => {
    expect(solve({ ...GAMING_25M, topK: 1 }, CATALOG).builds.map((b) => b.label)).toEqual(['performance']);
    expect(solve({ ...GAMING_25M, topK: 2 }, CATALOG).builds.map((b) => b.label)).toEqual([
      'performance',
      'balanced',
    ]);
    const full = solve(GAMING_25M, CATALOG);
    expect(solve({ ...GAMING_25M, topK: 1 }, CATALOG).builds[0]).toEqual(full.builds[0]);
  });

  it('returns fewer builds when fewer distinct CPU/GPU pairs exist, labelled in order', () => {
    const req: SolveRequest = {
      ...GAMING_25M,
      fixed: { cpu: 'cpu-r5-7600' },
      preferences: { gpuBrand: 'AMD' },
    };
    const result = solve(req, CATALOG);
    expect(result.builds.map((b) => b.label)).toEqual(['performance']);
    expect(result.builds[0]!.parts.gpu!.id).toBe('gpu-rx7600');
  });

  it('keeps the selected roles when only the GPU can vary (fixed cpu + board)', () => {
    const req: SolveRequest = { ...GAMING_25M, fixed: { cpu: 'cpu-r5-7600', mainboard: 'mb-b650m-white' } };
    const result = solve(req, CATALOG);
    const labels = result.builds.map((b) => b.label);
    expect(labels[0]).toBe('performance');
    expect(labels).toEqual(['performance', 'balanced', 'budget'].filter((l) => labels.includes(l as never)));
    expectValidBuilds(result, req);
  });
});

describe('solve — purpose policies', () => {
  // A cheaper, faster 16 GB AMD card: it would win for ai on raw performance alone.
  const amd16 = variant(
    'gpu-rx7600',
    { chipset: 'RX 7600 XT 16GB', vramGB: 16, lengthMm: 240, tgpW: 190 },
    { id: 'gpu-amd-16', price: 8_990_000, benchmark: { gpuScore: 15_000 } },
  );
  const catalog = [...CATALOG, amd16];
  const ai: SolveRequest = { budget: 45_000_000, purpose: 'ai' };

  it('ai without a brand preference prefers an NVIDIA (CUDA) card when one fits', () => {
    expect(scoreProduct(amd16, 'ai', catalog)).toBeGreaterThan(
      scoreProduct(byId('gpu-4060ti-16'), 'ai', catalog),
    );
    const result = solve(ai, catalog);
    expect((result.builds[0]!.parts.gpu!.specs as GpuSpecs).chipsetBrand).toBe('NVIDIA');
  });

  it("ai with gpuBrand 'AMD' still returns AMD cards", () => {
    const result = solve({ ...ai, preferences: { gpuBrand: 'AMD' } }, catalog);
    expect(result.builds.length).toBeGreaterThan(0);
    for (const b of result.builds) expect((b.parts.gpu!.specs as GpuSpecs).chipsetBrand).toBe('AMD');
    expect(result.builds[0]!.parts.gpu!.id).toBe('gpu-amd-16');
  });

  it('attaches the C14 under-spend warning only to the performance build', () => {
    for (const r of [
      solve(GAMING_25M, CATALOG),
      solve(ai, CATALOG),
      solve({ ...GAMING_25M, budget: 18e6 }, CATALOG),
    ]) {
      for (const b of r.builds) {
        if (b.label !== 'performance') expect(b.warnings.map((w) => w.code)).not.toContain('C14');
      }
    }
    const office = solve({ budget: 60_000_000, purpose: 'office' }, CATALOG);
    expect(office.builds[0]!.warnings.map((w) => w.code)).toContain('C14');
  });
});

describe('solve — cpu class vs board class', () => {
  it('no longer puts a high-end cpu on an entry board when a mid-range board fits the budget', () => {
    // Before C15 the 30M performance build paired the i7-14700K with the H610M.
    const req: SolveRequest = { budget: 30_000_000, purpose: 'gaming', fixed: { cpu: 'cpu-i7-14700k' } };
    const performance = solve(req, CATALOG).builds[0]!;
    expect(performance.parts.mainboard!.id).toBe('mb-b760m-white');
    expect(performance.warnings.map((w) => w.code)).not.toContain('C15');
  });

  it('keeps an entry board only when the mid-range one would cost a GPU tier, and flags it with C15', () => {
    const req: SolveRequest = { budget: 25_000_000, purpose: 'gaming', fixed: { cpu: 'cpu-i7-14700k' } };
    const result = solve(req, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    for (const b of result.builds) {
      const codes = b.warnings.map((w) => w.code);
      expect(codes.includes('C15')).toBe(b.parts.mainboard!.id === 'mb-h610m');
    }
  });

  it('still allows the pairing (with a C15 warning) when it is the only option', () => {
    const req: SolveRequest = {
      budget: 40_000_000,
      purpose: 'gaming',
      fixed: { cpu: 'cpu-i7-14700k', mainboard: 'mb-h610m' },
    };
    const result = solve(req, CATALOG);
    expect(result.builds.length).toBeGreaterThan(0);
    expect(result.builds[0]!.warnings.map((w) => w.code)).toContain('C15');
  });
});
