import { describe, expect, it } from 'vitest';
import { byId, CATALOG } from '../test/fixtures/catalog';
import { solve } from './solver';
import type { SolveRequest } from './types';

describe('solve — infeasible requests', () => {
  it('5,000,000₫ gaming with requireDiscreteGpu → BUDGET_TOO_LOW with the cheapest feasible total', () => {
    const req: SolveRequest = {
      budget: 5_000_000,
      purpose: 'gaming',
      preferences: { requireDiscreteGpu: true },
    };
    const result = solve(req, CATALOG);
    expect(result.builds).toEqual([]);
    expect(result.infeasibleReason).toBe('BUDGET_TOO_LOW');
    expect(result.minFeasibleBudget).toBeGreaterThan(5_000_000);

    const atMinimum = solve({ ...req, budget: result.minFeasibleBudget! }, CATALOG);
    expect(atMinimum.builds.length).toBeGreaterThan(0);
    expect(Math.min(...atMinimum.builds.map((b) => b.totalPrice))).toBe(result.minFeasibleBudget);
    const justBelow = solve({ ...req, budget: result.minFeasibleBudget! - 1 }, CATALOG);
    expect(justBelow.infeasibleReason).toBe('BUDGET_TOO_LOW');
  });

  it('fixed AM5 CPU + fixed LGA1700 board → FIXED_PART_CONFLICT', () => {
    const req: SolveRequest = {
      budget: 40_000_000,
      purpose: 'gaming',
      fixed: { cpu: 'cpu-r5-7600', mainboard: 'mb-z790' },
    };
    const result = solve(req, CATALOG);
    expect(result.builds).toEqual([]);
    expect(result.infeasibleReason).toBe('FIXED_PART_CONFLICT');
    expect(result.minFeasibleBudget).toBeUndefined();
  });

  it('fixed parts that no remaining part can complete → FIXED_PART_CONFLICT', () => {
    const req: SolveRequest = {
      budget: 60_000_000,
      purpose: 'gaming',
      fixed: { case: 'case-itx-sfx', gpu: 'gpu-4070' },
    };
    expect(solve(req, CATALOG).infeasibleReason).toBe('FIXED_PART_CONFLICT');
  });

  it('unknown or out-of-stock fixed part → FIXED_PART_CONFLICT', () => {
    const base: SolveRequest = { budget: 40_000_000, purpose: 'gaming' };
    expect(solve({ ...base, fixed: { gpu: 'gpu-does-not-exist' } }, CATALOG).infeasibleReason).toBe(
      'FIXED_PART_CONFLICT',
    );
    expect(solve({ ...base, fixed: { gpu: 'gpu-4070s-oos' } }, CATALOG).infeasibleReason).toBe(
      'FIXED_PART_CONFLICT',
    );
  });

  it('compatible fixed parts over budget → BUDGET_TOO_LOW including the fixed part price', () => {
    const req: SolveRequest = { budget: 15_000_000, purpose: 'gaming', fixed: { gpu: 'gpu-4070' } };
    const result = solve(req, CATALOG);
    expect(result.infeasibleReason).toBe('BUDGET_TOO_LOW');
    expect(result.minFeasibleBudget).toBeGreaterThan(byId('gpu-4070').price);
  });

  it('hard preferences nothing can satisfy → NO_COMPATIBLE_COMBINATION', () => {
    const req: SolveRequest = {
      budget: 60_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'Intel', formFactor: 'ITX' },
    };
    const result = solve(req, CATALOG);
    expect(result.builds).toEqual([]);
    expect(result.infeasibleReason).toBe('NO_COMPATIBLE_COMBINATION');
  });

  it('fixed parts plus unsatisfiable preferences → NO_COMPATIBLE_COMBINATION (not a fixed-part conflict)', () => {
    const req: SolveRequest = {
      budget: 60_000_000,
      purpose: 'gaming',
      fixed: { gpu: 'gpu-4060' },
      preferences: { cpuBrand: 'Intel', formFactor: 'ITX' },
    };
    expect(solve(req, CATALOG).infeasibleReason).toBe('NO_COMPATIBLE_COMBINATION');
  });

  it('an empty catalog → NO_COMPATIBLE_COMBINATION', () => {
    expect(solve({ budget: 20_000_000, purpose: 'office' }, []).infeasibleReason).toBe(
      'NO_COMPATIBLE_COMBINATION',
    );
  });

  it('every strategy agrees on the infeasibility diagnosis', () => {
    const req: SolveRequest = { budget: 5_000_000, purpose: 'gaming' };
    const expected = solve(req, CATALOG);
    for (const strategy of ['bruteforce', 'backtracking', 'forward-checking'] as const) {
      const r = solve({ ...req, strategy }, CATALOG);
      expect(r.infeasibleReason).toBe(expected.infeasibleReason);
      expect(r.minFeasibleBudget).toBe(expected.minFeasibleBudget);
    }
  });
});
