import { describe, expect, it } from 'vitest';
import {
  assignLabels,
  byObjective,
  byPrice,
  byRatio,
  byScore,
  type Candidate,
  CandidatePool,
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

describe('selectDiverse', () => {
  it('returns nothing for no candidates', () => {
    expect(selectDiverse([])).toEqual([]);
    expect(assignLabels([])).toEqual([]);
  });

  it('picks performance, cheapest ≥ 85% (budget) and best value above the midpoint (balanced)', () => {
    const perf = cand(100, 25, 1);
    const budget = cand(86, 15, 2);
    const cheapButWeak = cand(80, 10, 3);
    const balanced = cand(95, 20, 4);
    const pricierSameScore = cand(95, 24, 5);
    const picks = selectDiverse([perf, budget, cheapButWeak, balanced, pricierSameScore]);
    expect(picks).toEqual([perf, balanced, budget]);
    expect(assignLabels(picks).map((l) => l.label)).toEqual(['performance', 'balanced', 'budget']);
  });

  it('never repeats a (cpu, gpu) key', () => {
    const picks = selectDiverse([cand(100, 25, 1), cand(99, 15, 1), cand(90, 20, 2)]);
    expect(new Set(picks.map((p) => p.key)).size).toBe(picks.length);
  });

  it('fills empty slots with the best remaining keys when thresholds exclude them', () => {
    const perf = cand(100, 25, 1);
    const weak = cand(40, 10, 2);
    const weaker = cand(30, 9, 3);
    const picks = selectDiverse([perf, weak, weaker]);
    expect(picks).toEqual([perf, weak, weaker]);
    expect(assignLabels(picks).map((l) => [l.label, l.candidate.score])).toEqual([
      ['performance', 100],
      ['balanced', 40],
      ['budget', 30],
    ]);
  });

  it('labels alternatives by score, then by higher price, when scores tie', () => {
    const labels = assignLabels([cand(100, 30, 1), cand(90, 10, 2), cand(90, 20, 3)]);
    expect(labels.map((l) => l.candidate.price)).toEqual([30, 20, 10]);
    const twins = assignLabels([cand(100, 30, 1), cand(90, 20, 3, [9]), cand(90, 20, 2, [8])]);
    expect(twins.map((l) => l.candidate.idx[0])).toEqual([twins[0]!.candidate.idx[0], 8, 9]);
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

  it('drops non-top points below 85% of the best score but keeps each key top', () => {
    const pool = new CandidatePool();
    pool.add([1], 100, 100, 1);
    pool.add([2], 50, 10, 2); // top of key 2 → kept despite low score
    pool.add([3], 40, 5, 2); // below threshold and not top → dropped
    pool.add([4], 80, 50, 1); // below 85, not top of key 1 → dropped
    expect(
      pool
        .candidates()
        .map((c) => c.idx[0])
        .sort(),
    ).toEqual([1, 2]);
  });

  it('prunes stale low points once a key gets a better top', () => {
    const pool = new CandidatePool();
    pool.add([1], 100, 100, 1);
    pool.add([2], 90, 50, 2);
    pool.add([3], 88, 40, 2);
    pool.add([4], 99, 60, 2);
    const keyTwo = pool
      .candidates()
      .filter((c) => c.key === 2)
      .map((c) => c.score);
    expect(keyTwo.sort()).toEqual([88, 90, 99]);
    pool.add([5], 200, 300, 3);
    pool.add([6], 98, 55, 2); // below the new 170 threshold and not top → rejected
    pool.add([7], 150, 400, 2); // new top → stale 90/88 points are dropped
    expect(
      pool
        .candidates()
        .filter((c) => c.key === 2)
        .map((c) => c.score),
    ).toEqual([99, 150]);
  });
});
