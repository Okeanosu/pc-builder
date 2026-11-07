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

export interface LabelledCandidate {
  candidate: Candidate;
  label: BuildLabel;
}

/** Roles are kept as selected; a missing role is simply omitted ("return what exists"). */
export function labelRoles(
  performance: Candidate,
  balanced: Candidate | null,
  budget: Candidate | null,
): LabelledCandidate[] {
  const out: LabelledCandidate[] = [{ candidate: performance, label: 'performance' }];
  if (balanced) out.push({ candidate: balanced, label: 'balanced' });
  if (budget) out.push({ candidate: budget, label: 'budget' });
  return out;
}

function best(list: readonly Candidate[], cmp: Cmp): Candidate | null {
  let winner: Candidate | null = null;
  for (const c of list) if (!winner || cmp(c, winner) < 0) winner = c;
  return winner;
}

/**
 * Diverse top-3 shared by every strategy. Alternatives never cost more than performance; budget = cheapest with
 * score ≥ 85% of the best; balanced = best score/price above the budget–performance midpoint, else the best score
 * that keeps budget the cheapest. Each label uses a (cpu, gpu) pair not used by another.
 */
export function selectDiverse(candidates: readonly Candidate[]): LabelledCandidate[] {
  const performance = best(candidates, byScore);
  if (!performance) return [];
  const threshold = BUDGET_SCORE_RATIO * performance.score;
  const affordable = candidates.filter((c) => c.key !== performance.key && c.price <= performance.price);
  const budget = best(
    affordable.filter((c) => c.score >= threshold),
    byPrice,
  );
  const free = affordable.filter((c) => c.key !== budget?.key);
  const floor = balancedFloor(performance, budget, threshold);
  const balanced =
    best(
      free.filter((c) => c.score >= floor),
      byRatio,
    ) ??
    best(
      free.filter((c) => !budget || c.score >= threshold),
      byScore,
    );
  return labelRoles(performance, balanced, budget);
}

/**
 * Per-(cpu, gpu) Pareto fronts over (score ↑, price ↓) of every feasible build an exhaustive search sees. Every
 * label of `selectDiverse` is Pareto-optimal within its pair, so selecting from the fronts is exact.
 */
export class CandidatePool {
  private readonly fronts = new Map<number, Candidate[]>();

  add(idx: ArrayLike<number>, score: number, price: number, key: number): void {
    const front = this.fronts.get(key) ?? [];
    for (const f of front) {
      if (
        f.score >= score &&
        f.price <= price &&
        (f.score > score || f.price < price || compareSeq(f.idx, idx) < 0)
      ) {
        return;
      }
    }
    const kept = front.filter((f) => !(score >= f.score && price <= f.price));
    kept.push({ idx: Int32Array.from(idx), score, price, key, obj: score });
    this.fronts.set(key, kept);
  }

  candidates(): Candidate[] {
    return [...this.fronts.values()].flat();
  }
}
