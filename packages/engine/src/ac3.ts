import { CPU, compatible, GPU, type Problem, PSU, VAR_COUNT } from './domains';
import { estimateWattage, minPsuWattage } from './rules';

export interface Ac3Result {
  /** False when some domain became empty (no complete build can exist). */
  consistent: boolean;
  /** Number of values removed from all domains. */
  removed: number;
}

/** Removes values of `x` that have no compatible value left in the domain of `y`. */
function revise(problem: Problem, domains: number[][], x: number, y: number): number {
  const dx = domains[x]!;
  const dy = domains[y]!;
  const kept = dx.filter((i) => dy.some((j) => compatible(problem, x, i, y, j)));
  domains[x] = kept;
  return dx.length - kept.length;
}

/**
 * Bounds consistency for the ternary C08 rule `psu ≥ ceil((tdp + tgp + 75) × 1.3)`: the requirement is monotone in
 * tdp and tgp, so a value is supported iff it works against the most favourable bound of the other two domains.
 */
function reviseWattage(problem: Problem, domains: number[][]): Set<number> {
  const changed = new Set<number>();
  const required = (tdp: number, tgp: number) => minPsuWattage(estimateWattage(tdp, tgp));
  for (;;) {
    const minTdp = Math.min(...domains[CPU]!.map((i) => problem.tdp[i]!));
    const minTgp = Math.min(...domains[GPU]!.map((i) => problem.tgp[i]!));
    const maxWatt = Math.max(...domains[PSU]!.map((i) => problem.watt[i]!));
    const before = [domains[CPU]!.length, domains[GPU]!.length, domains[PSU]!.length];
    domains[PSU] = domains[PSU]!.filter((i) => problem.watt[i]! >= required(minTdp, minTgp));
    domains[CPU] = domains[CPU]!.filter((i) => required(problem.tdp[i]!, minTgp) <= maxWatt);
    domains[GPU] = domains[GPU]!.filter((i) => required(minTdp, problem.tgp[i]!) <= maxWatt);
    const after = [domains[CPU]!.length, domains[GPU]!.length, domains[PSU]!.length];
    if (after[0] !== before[0]) changed.add(CPU);
    if (after[1] !== before[1]) changed.add(GPU);
    if (after[2] !== before[2]) changed.add(PSU);
    if (after.every((n, k) => n === before[k]) || after.some((n) => n === 0)) return changed;
  }
}

/** AC-3 over the binary hard rules plus bounds consistency for the PSU wattage rule. Mutates `domains`. */
export function ac3(problem: Problem, domains: number[][]): Ac3Result {
  const total = () => domains.reduce((n, d) => n + d.length, 0);
  const start = total();
  const queue: [number, number][] = [];
  const queued = new Set<number>();
  const push = (x: number, y: number) => {
    const id = x * VAR_COUNT + y;
    if (!queued.has(id)) {
      queued.add(id);
      queue.push([x, y]);
    }
  };
  for (let x = 0; x < VAR_COUNT; x++) for (const y of problem.neighbors[x]!) push(x, y);

  let wattageDirty = true;
  while (queue.length > 0 || wattageDirty) {
    if (domains.some((d) => d.length === 0)) return { consistent: false, removed: start - total() };
    const arc = queue.shift();
    if (!arc) {
      wattageDirty = false;
      for (const v of reviseWattage(problem, domains)) for (const z of problem.neighbors[v]!) push(z, v);
      continue;
    }
    const [x, y] = arc;
    queued.delete(x * VAR_COUNT + y);
    if (revise(problem, domains, x, y) > 0) {
      for (const z of problem.neighbors[x]!) if (z !== y) push(z, x);
      if (x === CPU || x === GPU || x === PSU) wattageDirty = true;
    }
  }
  return { consistent: !domains.some((d) => d.length === 0), removed: start - total() };
}
