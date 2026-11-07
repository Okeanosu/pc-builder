import { CATEGORY_KEYS } from '@pc/shared';
import {
  CPU,
  exactScore,
  GPU,
  type Problem,
  PSU,
  psuSufficient,
  STATIC_ORDER,
  softPenalty,
  VAR_COUNT,
} from './domains';
import { estimateWattage, minPsuWattage } from './rules';
import { byObjective, type Candidate } from './topk';

export type Objective = { kind: 'maxScore' } | { kind: 'minPrice' } | { kind: 'linear'; lambda: number };

export type VariableOrder = 'static' | 'mrv' | 'weighted';

export interface SearchConfig {
  /** Filter future domains after each assignment (otherwise check against past assignments only). */
  forwardChecking: boolean;
  /**
   * `static`: CPU → MAINBOARD → RAM → COOLER → GPU → CASE → PSU → STORAGE; `mrv`: smallest domain first;
   * `weighted`: objective-weighted ordering with singleton domains first (largest purpose weight next).
   */
  variableOrder: VariableOrder;
  branchAndBound: boolean;
  budget: number;
  objective: Objective;
  /** Leaves scoring below this are infeasible. */
  minScore?: number;
  /** Forbidden (cpu, gpu) keys, enforced by forward checking. */
  forbidden?: ReadonlySet<number>;
  incumbent?: Candidate | null;
  /** Exhaustive mode: every feasible leaf is reported instead of keeping one incumbent. */
  onLeaf?: (idx: Int32Array, score: number, price: number, key: number) => void;
  nodeLimit: number;
}

export interface SearchResult {
  best: Candidate | null;
  nodes: number;
  prunedByForwardChecking: number;
  prunedByBound: number;
  capped: boolean;
}

const EPS = 1e-9;

function objectiveWeights(objective: Objective): [alpha: number, beta: number] {
  if (objective.kind === 'minPrice') return [0, 1];
  if (objective.kind === 'linear') return [1, objective.lambda];
  return [1, 0];
}

/** Branching priority per value (lower = tried first): most promising first so good incumbents appear early. */
function branchingRanks(problem: Problem, objective: Objective): Int32Array[] {
  const [alpha, beta] = objectiveWeights(objective);
  return problem.items.map((items, v) => {
    const range = problem.profile.allocation[CATEGORY_KEYS[v]!];
    const outOfRange = (i: number) => {
      const share = items[i]!.price / problem.budget;
      return objective.kind === 'maxScore' && (share < range.min || share > range.max) ? 1 : 0;
    };
    const gain = (i: number) => alpha * items[i]!.value - beta * items[i]!.price;
    const order = items
      .map((_, i) => i)
      .sort((a, b) => outOfRange(a) - outOfRange(b) || gain(b) - gain(a) || a - b);
    const rank = new Int32Array(items.length);
    order.forEach((i, r) => {
      rank[i] = r;
    });
    return rank;
  });
}

/**
 * Depth-first search over the CSP. One routine covers the thesis variants: plain backtracking (backward checks),
 * forward checking, variable ordering (static / MRV / weighted) and branch & bound with the MCKP LP-relaxation
 * bound. Domains must be non-empty when `branchAndBound` is on (callers run AC-3 first).
 */
export function search(problem: Problem, initial: number[][], cfg: SearchConfig): SearchResult {
  const { items, rel } = problem;
  const budget = cfg.budget;
  const [alpha, beta] = objectiveWeights(cfg.objective);
  const lambda = cfg.objective.kind === 'linear' ? cfg.objective.lambda : 0;
  const price = items.map((list) => list.map((it) => it.price));
  const value = items.map((list) => list.map((it) => it.value));
  const size = items.map((list) => list.length);
  const nGpu = size[GPU]!;
  const ranks = cfg.branchAndBound ? branchingRanks(problem, cfg.objective) : null;
  const assigned = new Int32Array(VAR_COUNT).fill(-1);
  // Scratch space for the per-node upper convex hulls of (price, value), one per variable.
  const hullP = size.map((n) => new Float64Array(n));
  const hullV = size.map((n) => new Float64Array(n));
  const hullLen = new Int32Array(VAR_COUNT);
  const cursor = new Int32Array(VAR_COUNT);
  let partialScore = 0;
  let partialPrice = 0;
  let nodes = 0;
  let prunedByForwardChecking = 0;
  let prunedByBound = 0;
  let capped = false;
  let best = cfg.incumbent ?? null;

  const weightOrder = [...STATIC_ORDER].sort(
    (a, b) => problem.profile.weights[CATEGORY_KEYS[b]!] - problem.profile.weights[CATEGORY_KEYS[a]!],
  );
  const pickVariable = (dom: number[][]): number => {
    if (cfg.variableOrder === 'weighted') {
      for (const v of weightOrder) if (assigned[v]! < 0 && dom[v]!.length === 1) return v;
      for (const v of weightOrder) if (assigned[v]! < 0) return v;
    }
    let chosen = -1;
    for (const v of STATIC_ORDER) {
      if (assigned[v]! >= 0) continue;
      if (cfg.variableOrder === 'static') return v;
      if (chosen < 0 || dom[v]!.length < dom[chosen]!.length) chosen = v;
    }
    return chosen;
  };

  const backwardConsistent = (x: number, i: number): boolean => {
    if (partialPrice + price[x]![i]! > budget) return false;
    for (const y of problem.neighbors[x]!) {
      const j = assigned[y]!;
      if (j >= 0 && rel[x]![y]![i * size[y]! + j] !== 1) return false;
    }
    if (x !== CPU && x !== GPU && x !== PSU) return true;
    const c = x === CPU ? i : assigned[CPU]!;
    const g = x === GPU ? i : assigned[GPU]!;
    const p = x === PSU ? i : assigned[PSU]!;
    return c < 0 || g < 0 || p < 0 || psuSufficient(problem, c, g, p);
  };

  /** Ternary C08 filter for the last unassigned member of {cpu, gpu, psu}, or null if not applicable. */
  const wattageFilter = (y: number): ((j: number) => boolean) | null => {
    const c = assigned[CPU]!;
    const g = assigned[GPU]!;
    const p = assigned[PSU]!;
    const required = (tdp: number, tgp: number) => minPsuWattage(estimateWattage(tdp, tgp));
    if (y === PSU && c >= 0 && g >= 0) {
      const need = required(problem.tdp[c]!, problem.tgp[g]!);
      return (j) => problem.watt[j]! >= need;
    }
    if (y === GPU && c >= 0 && p >= 0)
      return (j) => required(problem.tdp[c]!, problem.tgp[j]!) <= problem.watt[p]!;
    if (y === CPU && g >= 0 && p >= 0)
      return (j) => required(problem.tdp[j]!, problem.tgp[g]!) <= problem.watt[p]!;
    return null;
  };

  const forwardCheck = (x: number, i: number, dom: number[][]): number[][] | null => {
    const next = dom.slice();
    const left = budget - partialPrice;
    const touchesWattage = x === CPU || x === GPU || x === PSU;
    for (let y = 0; y < VAR_COUNT; y++) {
      if (assigned[y]! >= 0) continue;
      const d = dom[y]!;
      const r = rel[x]![y];
      const ny = size[y]!;
      const watt = touchesWattage ? wattageFilter(y) : null;
      const forbidden =
        cfg.forbidden && cfg.forbidden.size > 0 && ((x === CPU && y === GPU) || (x === GPU && y === CPU))
          ? cfg.forbidden
          : null;
      let kept: number[] | null = null;
      for (let k = 0; k < d.length; k++) {
        const j = d[k]!;
        const ok =
          price[y]![j]! <= left &&
          (r ? r[i * ny + j] === 1 : true) &&
          (!watt || watt(j)) &&
          !forbidden?.has(x === CPU ? i * nGpu + j : j * nGpu + i);
        if (ok) kept?.push(j);
        else kept ??= d.slice(0, k);
      }
      if (kept) {
        prunedByForwardChecking += d.length - kept.length;
        if (kept.length === 0) return null;
        next[y] = kept;
      }
    }
    return next;
  };

  /**
   * Builds, for every unassigned variable, the upper convex hull of its (price, value) points that fit in the
   * remaining budget. Domains are kept price-ascending, so this is a single monotone-chain pass per variable.
   * Returns the base (cheapest-per-category) cost, or +∞ when even that exceeds the budget.
   */
  const buildHulls = (dom: number[][]): { cost: number; value: number } => {
    let cost = 0;
    let base = 0;
    for (let r = 0; r < VAR_COUNT; r++) if (assigned[r]! < 0) cost += price[r]![dom[r]![0]!]!;
    const slack = budget - partialPrice - cost;
    if (slack < 0) return { cost: Number.POSITIVE_INFINITY, value: 0 };
    for (let r = 0; r < VAR_COUNT; r++) {
      if (assigned[r]! >= 0) continue;
      const hp = hullP[r]!;
      const hv = hullV[r]!;
      const pr = price[r]!;
      const vr = value[r]!;
      const d = dom[r]!;
      const cap = pr[d[0]!]! + slack;
      let n = 0;
      for (const j of d) {
        const p = pr[j]!;
        if (p > cap) break;
        const v = vr[j]!;
        if (n > 0 && v <= hv[n - 1]!) continue;
        while (
          n >= 2 &&
          (hp[n - 1]! - hp[n - 2]!) * (v - hv[n - 2]!) >= (hv[n - 1]! - hv[n - 2]!) * (p - hp[n - 2]!)
        )
          n--;
        hp[n] = p;
        hv[n] = v;
        n++;
      }
      hullLen[r] = n;
      cursor[r] = 1;
      base += hv[0]!;
    }
    return { cost, value: base };
  };

  /** Next hull segment with the best value-per-price over all variables, or -1. */
  const bestSegment = (): number => {
    let chosen = -1;
    let bestEff = 0;
    for (let r = 0; r < VAR_COUNT; r++) {
      if (assigned[r]! >= 0) continue;
      const k = cursor[r]!;
      if (k >= hullLen[r]!) continue;
      const eff = (hullV[r]![k]! - hullV[r]![k - 1]!) / (hullP[r]![k]! - hullP[r]![k - 1]!);
      if (chosen < 0 || eff > bestEff) {
        chosen = r;
        bestEff = eff;
      }
    }
    return chosen;
  };

  /**
   * LP relaxation: max Σ(value − λ·price) s.t. Σ price ≤ room, Σ value ≥ need (−∞ if unreachable). The greedy hull
   * walk is concave in spend, so the optimum is where efficiency falls to λ, clamped to the floor and the room.
   */
  const relaxedGain = (room: number, penalty: number, need: number): number => {
    for (let r = 0; r < VAR_COUNT; r++) cursor[r] = 1;
    let gain = 0;
    let gained = 0;
    for (;;) {
      const r = bestSegment();
      if (r < 0) return gained >= need - EPS ? gain : Number.NEGATIVE_INFINITY;
      const k = cursor[r]!;
      const dp = hullP[r]![k]! - hullP[r]![k - 1]!;
      const dv = hullV[r]![k]! - hullV[r]![k - 1]!;
      const eff = dv / dp;
      if (eff <= penalty) {
        if (gained >= need) return gain;
        const take = Math.min(dv, need - gained);
        if (take / eff > room + EPS) return Number.NEGATIVE_INFINITY;
        gain += take - (penalty * take) / eff;
        if (take < dv) return gain;
        gained += dv;
        room -= dp;
      } else if (dp >= room) {
        return gained + eff * room >= need - EPS ? gain + (eff - penalty) * room : Number.NEGATIVE_INFINITY;
      } else {
        gain += dv - penalty * dp;
        gained += dv;
        room -= dp;
      }
      cursor[r] = k + 1;
    }
  };

  /** LP relaxation lower bound on the extra price needed to gain `need` value, or +∞ if unreachable. */
  const relaxedCost = (need: number): number => {
    for (let r = 0; r < VAR_COUNT; r++) cursor[r] = 1;
    let cost = 0;
    while (need > EPS) {
      const r = bestSegment();
      if (r < 0) return Number.POSITIVE_INFINITY;
      const k = cursor[r]!;
      const dp = hullP[r]![k]! - hullP[r]![k - 1]!;
      const dv = hullV[r]![k]! - hullV[r]![k - 1]!;
      if (dv >= need) return cost + (need * dp) / dv;
      cost += dp;
      need -= dv;
      cursor[r] = k + 1;
    }
    return cost;
  };

  /** True when no completion of the current partial assignment can be feasible and better than the incumbent. */
  const boundPrunes = (dom: number[][]): boolean => {
    const base = buildHulls(dom);
    if (base.cost === Number.POSITIVE_INFINITY) return true;
    const room = budget - partialPrice - base.cost;
    const floorScore = partialScore - softPenalty(problem, assigned) + base.value;
    if (cfg.objective.kind === 'minPrice') {
      const need = cfg.minScore === undefined ? 0 : cfg.minScore - floorScore;
      const extra = need > 0 ? relaxedCost(need) : 0;
      if (extra > room + EPS) return true;
      return best !== null && partialPrice + base.cost + extra > best.price + EPS;
    }
    const need = cfg.minScore === undefined ? 0 : Math.max(0, cfg.minScore - floorScore);
    const gain = relaxedGain(room, lambda, need);
    if (gain === Number.NEGATIVE_INFINITY) return true;
    if (best === null) return false;
    const ubObjective = floorScore - lambda * (partialPrice + base.cost) + gain;
    return ubObjective < best.obj - EPS;
  };

  const leaf = () => {
    const score = exactScore(problem, assigned);
    if (cfg.minScore !== undefined && score < cfg.minScore) return;
    const key = assigned[CPU]! * nGpu + assigned[GPU]!;
    if (cfg.onLeaf) {
      cfg.onLeaf(assigned, score, partialPrice, key);
      return;
    }
    const candidate: Candidate = {
      idx: assigned.slice(),
      score,
      price: partialPrice,
      key,
      obj: alpha * score - beta * partialPrice,
    };
    if (!best || byObjective(candidate, best) < 0) best = candidate;
  };

  const expand = (depth: number, dom: number[][]): void => {
    if (depth === VAR_COUNT) {
      leaf();
      return;
    }
    const x = pickVariable(dom);
    const rank = ranks?.[x];
    const values = rank ? [...dom[x]!].sort((a, b) => rank[a]! - rank[b]!) : dom[x]!;
    const savedScore = partialScore;
    const savedPrice = partialPrice;
    for (const i of values) {
      if (nodes >= cfg.nodeLimit) {
        capped = true;
        return;
      }
      nodes++;
      if (!cfg.forwardChecking && !backwardConsistent(x, i)) continue;
      assigned[x] = i;
      partialScore = savedScore + value[x]![i]!;
      partialPrice = savedPrice + price[x]![i]!;
      let next: number[][] | null = cfg.forwardChecking ? forwardCheck(x, i, dom) : dom;
      if (next && cfg.branchAndBound && boundPrunes(next)) {
        prunedByBound++;
        next = null;
      }
      if (next) expand(depth + 1, next);
      assigned[x] = -1;
      partialScore = savedScore;
      partialPrice = savedPrice;
      if (capped) return;
    }
  };

  const byPriceThenValue = (v: number) => (a: number, b: number) =>
    price[v]![a]! - price[v]![b]! || value[v]![b]! - value[v]![a]! || a - b;
  expand(
    0,
    initial.map((dom, v) => [...dom].sort(byPriceThenValue(v))),
  );
  return { best, nodes, prunedByForwardChecking, prunedByBound, capped };
}
