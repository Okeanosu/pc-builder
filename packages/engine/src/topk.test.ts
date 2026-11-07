import { describe, expect, it } from 'vitest';
import {
  byObjective,
  byPrice,
  byRatio,
  byScore,
  type Candidate,
  CandidatePool,
  labelRoles,
  selectDiverse,
} from './topk';

let seq = 0;
const cand = (score: number, price: number, key: number, idx?: number[]): Candidate => ({
  idx: Int32Array.from(idx ?? [seq++]),
  score,
  price,
  key,
  obj: score,
});

describe('comparators', () => {
  it('break ties canonically: score, then price, then item order', () => {
    const a = cand(50, 100, 1, [1]);
    const b = cand(50, 100, 2, [2]);
    expect(byScore(a, b)).toBeLessThan(0);
    expect(byScore(cand(50, 90, 1), a)).toBeLessThan(0);
    expect(byPrice(a, b)).toBeLessThan(0);
    expect(byPrice(cand(51, 100, 1), a)).toBeLessThan(0);
    expect(byRatio(a, b)).toBeLessThan(0);
    expect(byRatio(cand(100, 200, 1), cand(50, 100, 1))).toBeLessThan(0);
    expect(byRatio(cand(50, 100, 1, [5]), cand(50, 100, 1, [4]))).toBeGreaterThan(0);
    expect(byObjective({ ...a, obj: 1 }, { ...b, obj: 1 })).toBeLessThan(0);
    expect(byObjective({ ...a, obj: 1, price: 90 }, { ...a, obj: 1 })).toBeLessThan(0);
  });
});

const roles = (picks: ReturnType<typeof selectDiverse>) => picks.map((p) => [p.label, p.candidate.score]);

describe('selectDiverse', () => {
  it('returns nothing for no candidates', () => {
    expect(selectDiverse([])).toEqual([]);
  });

  it('picks performance, cheapest ≥ 85% (budget) and best value above the midpoint (balanced)', () => {
    const perf = cand(100, 25, 1);
    const budget = cand(86, 15, 2);
    const cheapButWeak = cand(80, 10, 3);
    const balanced = cand(95, 20, 4);
    const pricierSameScore = cand(95, 24, 5);
    const picks = selectDiverse([perf, budget, cheapButWeak, balanced, pricierSameScore]);
    expect(picks).toEqual(labelRoles(perf, balanced, budget));
    expect(picks.map((p) => p.label)).toEqual(['performance', 'balanced', 'budget']);
  });

  it('never repeats a (cpu, gpu) key', () => {
    const picks = selectDiverse([cand(100, 25, 1), cand(99, 15, 1), cand(90, 20, 2)]);
    expect(new Set(picks.map((p) => p.candidate.key)).size).toBe(picks.length);
  });

  it('never offers an alternative that costs more than performance', () => {
    const picks = selectDiverse([cand(100, 20, 1), cand(95, 22, 2), cand(90, 15, 3)]);
    expect(roles(picks)).toEqual([
      ['performance', 100],
      ['budget', 90],
    ]);
  });

  it('falls back to the best score above 85% for balanced when nothing reaches the midpoint', () => {
    const picks = selectDiverse([cand(100, 25, 1), cand(86, 15, 2), cand(88, 20, 3)]);
    expect(roles(picks)).toEqual([
      ['performance', 100],
      ['balanced', 88],
      ['budget', 86],
    ]);
  });

  it('never lets a weaker fill undercut the budget build', () => {
    const picks = selectDiverse([cand(100, 25, 1), cand(86, 15, 2), cand(50, 10, 3)]);
    expect(roles(picks)).toEqual([
      ['performance', 100],
      ['budget', 86],
    ]);
  });

  it('without any build reaching 85%, offers the best affordable alternative as balanced and no budget', () => {
    const picks = selectDiverse([cand(100, 25, 1), cand(40, 10, 2), cand(30, 9, 3)]);
    expect(roles(picks)).toEqual([
      ['performance', 100],
      ['balanced', 40],
    ]);
  });
});

describe('labelRoles', () => {
  it('keeps the roles and omits missing ones', () => {
    const p = cand(100, 25, 1);
    const b = cand(90, 10, 2);
    expect(labelRoles(p, null, b).map((l) => l.label)).toEqual(['performance', 'budget']);
    expect(labelRoles(p, null, null).map((l) => l.label)).toEqual(['performance']);
  });
});

describe('CandidatePool', () => {
  it('keeps only the per-key Pareto front (score ↑, price ↓)', () => {
    const pool = new CandidatePool();
    pool.add([1], 50, 100, 7);
    pool.add([2], 40, 120, 7); // dominated
    pool.add([3], 60, 130, 7); // new top, keeps the cheaper point
    pool.add([4], 55, 90, 7); // dominates the first point
    const front = pool.candidates().map((c) => [c.score, c.price]);
    expect(front).toEqual([
      [60, 130],
      [55, 90],
    ]);
  });

  it('resolves exact duplicates by item order', () => {
    const pool = new CandidatePool();
    pool.add([5], 50, 100, 1);
    pool.add([4], 50, 100, 1);
    pool.add([6], 50, 100, 1);
    expect(pool.candidates().map((c) => c.idx[0])).toEqual([4]);
  });

  it('keeps cheap low-score points: they can be the best alternative under the performance price', () => {
    const pool = new CandidatePool();
    pool.add([1], 100, 100, 1);
    pool.add([2], 50, 10, 2);
    pool.add([3], 40, 5, 2);
    expect(
      pool
        .candidates()
        .filter((c) => c.key === 2)
        .map((c) => c.score),
    ).toEqual([50, 40]);
  });
});
