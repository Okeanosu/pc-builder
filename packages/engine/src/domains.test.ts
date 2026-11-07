import { CATEGORY_KEYS, type CategoryKey } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { byId, CATALOG, variant } from '../test/fixtures/catalog';
import {
  buildProblem,
  exactScore,
  initialDomains,
  matchesPreferences,
  pruneDominated,
  softPenalty,
} from './domains';
import { DEFAULT_PROFILES } from './profiles';
import type { EngineProduct, SolveRequest } from './types';

const gaming: SolveRequest = { budget: 30_000_000, purpose: 'gaming' };

/** Builds a problem from the fixture with `extra` products and returns the surviving ids of one category. */
function survivors(category: CategoryKey, extra: EngineProduct[], base: EngineProduct[] = CATALOG): string[] {
  const problem = buildProblem(gaming, [...base, ...extra], DEFAULT_PROFILES.gaming);
  const domains = initialDomains(problem);
  pruneDominated(problem, domains);
  const v = CATEGORY_KEYS.indexOf(category);
  return domains[v]!.map((i) => problem.items[v]![i]!.id);
}

describe('pruneDominated', () => {
  it('drops a pricier, weaker, equally compatible part', () => {
    const worse = variant('ssd-nvme-1tb', { readMBps: 3000 }, { id: 'ssd-worse', price: 1_990_000 });
    expect(survivors('storage', [worse])).not.toContain('ssd-worse');
  });

  it('keeps a weaker part that is more compatible (SATA works without an M.2 slot)', () => {
    expect(survivors('storage', [])).toContain('ssd-sata-500');
  });

  it('breaks exact ties (same value and price) by id, keeping exactly one', () => {
    const twin = { ...byId('ssd-nvme-1tb'), id: 'ssd-nvme-1tb-twin' };
    const kept = survivors('storage', [twin]);
    expect(kept).toContain('ssd-nvme-1tb');
    expect(kept).not.toContain('ssd-nvme-1tb-twin');
  });

  it('never prunes CPUs or GPUs (they define build diversity)', () => {
    const worseGpu = variant('gpu-4060', {}, { id: 'gpu-4060-overpriced', price: 9_990_000 });
    expect(survivors('gpu', [worseGpu])).toContain('gpu-4060-overpriced');
  });

  it('respects mainboard compatibility features', () => {
    const fewerSlots = variant(
      'mb-b650m-white',
      { memorySlots: 2 },
      { id: 'mb-cheap-2slot', price: 3_000_000 },
    );
    const noM2 = variant('mb-b650m-white', { m2Slots: 0 }, { id: 'mb-cheap-nom2', price: 3_000_000 });
    const pricier = variant('mb-b650m-white', {}, { id: 'mb-pricier', price: 4_990_000 });
    const kept = survivors('mainboard', [fewerSlots, noM2, pricier]);
    expect(kept).toContain('mb-cheap-2slot');
    expect(kept).toContain('mb-cheap-nom2');
    expect(kept).not.toContain('mb-pricier');
  });

  it('respects ram module count and capacity', () => {
    const moreModules = variant('ram-ddr5-32', { modules: 4 }, { id: 'ram-4x', price: 3_490_000 });
    expect(survivors('ram', [moreModules])).not.toContain('ram-4x');
    const cheaperBigger = variant('ram-ddr5-32', { capacityGB: 48 }, { id: 'ram-48', price: 2_000_000 });
    expect(survivors('ram', [cheaperBigger])).toContain('ram-ddr5-32');
  });

  it('respects psu form factor and wattage', () => {
    const weakerSame = variant('psu-650-gold', { wattage: 600 }, { id: 'psu-600-pricey', price: 2_200_000 });
    expect(survivors('psu', [weakerSame])).not.toContain('psu-600-pricey');
    expect(survivors('psu', [])).toContain('psu-sfx-600');
  });

  it('respects case clearances and supported standards', () => {
    const smaller = variant(
      'case-atx-black',
      { maxGpuLengthMm: 300 },
      { id: 'case-smaller', price: 2_490_000 },
    );
    expect(survivors('case', [smaller])).not.toContain('case-smaller');
    expect(survivors('case', [])).toContain('case-itx-sfx');
  });

  it('respects cooler type, height, radiator and sockets', () => {
    const taller = variant('cooler-ak400', { heightMm: 165 }, { id: 'cooler-taller', price: 790_000 });
    const sameAio = variant('cooler-aio-240', {}, { id: 'cooler-aio-240-pricey', price: 1_990_000 });
    const otherRadiator = variant(
      'cooler-aio-240',
      { radiatorMm: 280 },
      { id: 'cooler-aio-280', price: 1_990_000 },
    );
    const kept = survivors('cooler', [taller, sameAio, otherRadiator]);
    expect(kept).not.toContain('cooler-taller');
    expect(kept).not.toContain('cooler-aio-240-pricey');
    expect(kept).toContain('cooler-aio-280');
    expect(kept).toContain('cooler-lowprofile');

    // Missing size data means "fits anywhere", which makes a part more permissive.
    const noHeight = variant(
      'cooler-ak400',
      { heightMm: undefined },
      { id: 'cooler-noheight', price: 600_000 },
    );
    const anyRadiator = variant(
      'cooler-aio-240',
      { radiatorMm: undefined },
      { id: 'cooler-aio-any', price: 1_000_000 },
    );
    const relaxed = survivors('cooler', [noHeight, anyRadiator]);
    expect(relaxed).toContain('cooler-noheight');
    expect(relaxed).not.toContain('cooler-ak400');
    expect(relaxed).toContain('cooler-aio-any');
    expect(relaxed).not.toContain('cooler-aio-240');
  });
});

describe('problem model', () => {
  it('matches preferences per category and ignores unrelated categories', () => {
    expect(matchesPreferences(byId('cpu-r5-7600'), { cpuBrand: 'AMD' })).toBe(true);
    expect(matchesPreferences(byId('cpu-r5-7600'), { cpuBrand: 'Intel' })).toBe(false);
    expect(matchesPreferences(byId('psu-650-gold'), { cpuBrand: 'Intel', minRamGB: 64 })).toBe(true);
  });

  it('scores penalties only for decided soft rules', () => {
    const problem = buildProblem(gaming, CATALOG, DEFAULT_PROFILES.gaming);
    const idOf = (v: number, id: string) => problem.items[v]!.findIndex((it) => it.id === id);
    const partial = [idOf(0, 'cpu-i3-12100f'), -1, -1, idOf(3, 'gpu-4070'), -1, -1, -1, -1];
    expect(softPenalty(problem, partial)).toBe(2);
    expect(softPenalty(problem, [-1, -1, -1, -1, -1, -1, -1, -1])).toBe(0);
    const full = [
      idOf(0, 'cpu-i3-12100f'),
      idOf(1, 'mb-h610m'),
      idOf(2, 'ram-ddr4-16'),
      idOf(3, 'gpu-4070'),
      idOf(4, 'ssd-nvme-500'),
      idOf(5, 'psu-450-bronze'),
      idOf(6, 'case-matx-white'),
      idOf(7, 'cooler-lowprofile'),
    ];
    const sumValues = full.reduce((s, i, v) => s + problem.items[v]![i]!.value, 0);
    // C13 (tier 1 vs 4) + C08 headroom (450 W < 1.5 × 333 W); the 95 W cooler covers the 58 W cpu.
    expect(exactScore(problem, full)).toBeCloseTo(sumValues - 4, 9);
  });
});
