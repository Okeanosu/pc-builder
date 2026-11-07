import { BUILD_LABELS, type BuildLabel } from '@pc/shared';

/** "Tiết kiệm" must reach this share of the best score. */
export const BUDGET_SCORE_RATIO = 0.85;
export const MAX_BUILDS = BUILD_LABELS.length;

export interface Candidate {
  /** Chosen item index per variable (category order). */
  idx: Int32Array;
  score: number;
  price: number;
  /** Diversity key: the (cpu, gpu) pair. */
  key: number;
  /** Objective value of the search that produced it (α·score − β·price). */
  obj: number;
}

type Cmp = (a: Candidate, b: Candidate) => number;

/** Canonical tie-break: item indices are id-sorted, so this is lexicographic order of product ids by category. */
export function compareSeq(a: ArrayLike<number>, b: ArrayLike<number>): number {
  for (let v = 0; v < a.length; v++) {
    const d = a[v]! - b[v]!;
    if (d !== 0) return d;
  }
  return 0;
}

// Each comparator returns < 0 when `a` should be preferred.
export const byScore: Cmp = (a, b) => b.score - a.score || a.price - b.price || compareSeq(a.idx, b.idx);
export const byPrice: Cmp = (a, b) => a.price - b.price || b.score - a.score || compareSeq(a.idx, b.idx);
export const byRatio: Cmp = (a, b) =>
  b.score / b.price - a.score / a.price || b.score - a.score || a.price - b.price || compareSeq(a.idx, b.idx);
export const byObjective: Cmp = (a, b) =>
  b.obj - a.obj || b.score - a.score || a.price - b.price || compareSeq(a.idx, b.idx);

export function balancedFloor(performance: Candidate, budget: Candidate | null, threshold: number): number {
  return (performance.score + (budget ? budget.score : threshold)) / 2;
}

function best(list: readonly Candidate[], cmp: Cmp): Candidate | null {
  let winner: Candidate | null = null;
  for (const c of list) if (!winner || cmp(c, winner) < 0) winner = c;
  return winner;
}

/**
 * Exact definition of the diverse top-3, shared by the exhaustive strategies (applied to a candidate pool) and the
 * branch-and-bound strategy (one constrained search per label):
 *  - performance: max score;
 *  - budget: cheapest build with score ≥ 85% of the best, other (cpu, gpu) pair;
 *  - balanced: max score/price among builds scoring at least halfway between budget and performance, (cpu, gpu)
 *    pair unused so far (score/price alone would collapse onto the cheapest acceptable build);
 *  - any slot still empty: best score among unused pairs.
 */
export function selectDiverse(candidates: readonly Candidate[]): Candidate[] {
  const performance = best(candidates, byScore);
  if (!performance) return [];
  const threshold = BUDGET_SCORE_RATIO * performance.score;
  const budget = best(
    candidates.filter((c) => c.key !== performance.key && c.score >= threshold),
    byPrice,
  );
  const used = new Set([performance.key]);
  if (budget) used.add(budget.key);
  const floor = balancedFloor(performance, budget, threshold);
  const balanced = best(
    candidates.filter((c) => !used.has(c.key) && c.score >= floor),
    byRatio,
  );
  const picks = [performance];
  if (balanced) picks.push(balanced);
  if (budget) picks.push(budget);
  for (const c of picks) used.add(c.key);
  while (picks.length < MAX_BUILDS) {
    const next = best(
      candidates.filter((c) => !used.has(c.key)),
      byScore,
    );
    if (!next) break;
    picks.push(next);
    used.add(next.key);
  }
  return picks;
}

/** First pick is "performance"; the others are labelled balanced → budget by descending score (then price). */
export function assignLabels(picks: readonly Candidate[]): { candidate: Candidate; label: BuildLabel }[] {
  const [first, ...rest] = picks;
  if (!first) return [];
  rest.sort((a, b) => b.score - a.score || b.price - a.price || compareSeq(a.idx, b.idx));
  return [first, ...rest].map((candidate, i) => ({ candidate, label: BUILD_LABELS[i]! }));
}

/**
 * Per-(cpu, gpu) Pareto fronts over (score ↑, price ↓) of every feasible build seen by an exhaustive search. Every
 * label of `selectDiverse` is Pareto-optimal within its pair, and points below 85% of the best score can only matter
 * as a pair's top, so the pool stays small while remaining exact.
 */
export class CandidatePool {
  private readonly fronts = new Map<number, Candidate[]>();
  private bestScore = Number.NEGATIVE_INFINITY;

  add(idx: ArrayLike<number>, score: number, price: number, key: number): void {
    const front = this.fronts.get(key) ?? [];
    let isTop = true;
    for (const f of front) {
      if (
        f.score >= score &&
        f.price <= price &&
        (f.score > score || f.price < price || compareSeq(f.idx, idx) < 0)
      ) {
        return;
      }
      if (f.score > score) isTop = false;
    }
    if (!isTop && score < BUDGET_SCORE_RATIO * this.bestScore) return;
    const candidate: Candidate = { idx: Int32Array.from(idx), score, price, key, obj: score };
    const kept = front.filter(
      (f) =>
        !(score >= f.score && price <= f.price) &&
        (f.score >= BUDGET_SCORE_RATIO * this.bestScore || isTopOf(front, f)),
    );
    kept.push(candidate);
    this.fronts.set(key, kept);
    if (score > this.bestScore) this.bestScore = score;
  }

  candidates(): Candidate[] {
    return [...this.fronts.values()].flat();
  }
}

function isTopOf(front: readonly Candidate[], c: Candidate): boolean {
  return front.every((f) => byScore(c, f) <= 0);
}
