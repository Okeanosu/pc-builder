import { describe, expect, it } from 'vitest';
import { buildReport, previewCandidate, slotSeverity, toEngineProduct } from './compat';
import {
  AM5_CPU,
  B650_BOARD,
  BIG_GPU,
  DDR4_KIT,
  DDR5_KIT,
  LGA1700_CPU,
  product,
  SMALL_CASE,
  WEAK_PSU,
} from './fixtures';

describe('toEngineProduct', () => {
  it('uses the sale price and drops a null benchmark', () => {
    const p = toEngineProduct(product('x', 'cpu', AM5_CPU.specs, 5_000_000, { salePrice: 4_500_000 }));
    expect(p.price).toBe(4_500_000);
    expect(p.benchmark).toBeUndefined();
  });
});

describe('buildReport', () => {
  it('passes a matching AM5 trio', () => {
    const r = buildReport({ cpu: AM5_CPU, mainboard: B650_BOARD, ram: DDR5_KIT }, { purpose: 'gaming' });
    expect(r.issues).toEqual([]);
    expect(r.estimatedWattage).toBe(65 + 75);
  });

  it('flags a socket mismatch as C01', () => {
    const r = buildReport({ cpu: LGA1700_CPU, mainboard: B650_BOARD }, { purpose: 'gaming' });
    expect(r.issues.map((i) => i.code)).toContain('C01');
    expect(r.issues.find((i) => i.code === 'C01')?.severity).toBe('error');
  });

  it('adds the budget rule only when a budget is set', () => {
    const parts = { cpu: AM5_CPU, gpu: BIG_GPU };
    expect(buildReport(parts, { purpose: 'gaming' }).issues.some((i) => i.code === 'C14')).toBe(false);
    const over = buildReport(parts, { purpose: 'gaming', budget: 10_000_000 });
    expect(over.issues.find((i) => i.code === 'C14')?.severity).toBe('error');
  });
});

describe('slotSeverity', () => {
  it('marks both parts of a pair rule, worst severity first, ignoring the budget rule', () => {
    const r = buildReport(
      { cpu: LGA1700_CPU, mainboard: B650_BOARD, ram: DDR4_KIT, gpu: BIG_GPU },
      { purpose: 'gaming', budget: 1_000_000 },
    );
    const s = slotSeverity(r.issues);
    expect(s.cpu).toBe('error');
    expect(s.mainboard).toBe('error');
    expect(s.ram).toBe('error');
    expect(s.gpu).toBeUndefined();
  });
});

describe('previewCandidate', () => {
  it('dims a CPU whose socket does not fit the chosen board, with the reason', () => {
    const v = previewCandidate({ mainboard: B650_BOARD }, LGA1700_CPU, { purpose: 'gaming' });
    expect(v.status).toBe('error');
    expect(v.issues[0]?.code).toBe('C01');
    expect(v.issues[0]?.message).toMatch(/Socket/);
  });

  it('ignores problems that are about missing parts or unrelated slots', () => {
    const v = previewCandidate({ mainboard: B650_BOARD, ram: DDR4_KIT }, BIG_GPU, { purpose: 'gaming' });
    expect(v.status).toBe('ok');
    expect(v.issues).toEqual([]);
    const noGpu = previewCandidate({}, LGA1700_CPU, { purpose: 'gaming' });
    expect(noGpu.status).toBe('ok');
    const ramMismatch = previewCandidate({ ram: DDR4_KIT }, AM5_CPU, { purpose: 'gaming' });
    expect(ramMismatch.issues.map((i) => i.code)).toEqual(['C02']);
  });

  it('replaces the part already in the slot instead of comparing against it', () => {
    const v = previewCandidate({ cpu: LGA1700_CPU, mainboard: B650_BOARD }, AM5_CPU, { purpose: 'gaming' });
    expect(v.status).toBe('ok');
  });

  it('flags a GPU that does not fit the case and a PSU that is too weak', () => {
    expect(previewCandidate({ case: SMALL_CASE }, BIG_GPU, { purpose: 'gaming' }).issues[0]?.code).toBe(
      'C05',
    );
    const psu = previewCandidate({ cpu: AM5_CPU, gpu: BIG_GPU }, WEAK_PSU, { purpose: 'gaming' });
    expect(psu.status).toBe('error');
    expect(psu.issues[0]?.code).toBe('C08');
  });

  it('reports going over budget without marking the part incompatible', () => {
    const v = previewCandidate({ cpu: AM5_CPU }, BIG_GPU, { purpose: 'gaming', budget: 10_000_000 });
    expect(v.status).toBe('ok');
    expect(v.overBudget).toBe(true);
  });
});
