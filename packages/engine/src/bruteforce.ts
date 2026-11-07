import {
  CPU,
  candidateKey,
  exactPrice,
  exactScore,
  GPU,
  type Problem,
  PSU,
  psuSufficient,
  STATIC_ORDER,
} from './domains';

export interface BruteForceResult {
  nodes: number;
  capped: boolean;
}

function feasible(problem: Problem, idx: Int32Array, budget: number): boolean {
  if (exactPrice(problem, idx) > budget) return false;
  for (let a = 0; a < idx.length; a++) {
    for (const b of problem.neighbors[a]!) {
      if (b > a && problem.rel[a]![b]![idx[a]! * problem.items[b]!.length + idx[b]!] !== 1) return false;
    }
  }
  return psuSufficient(problem, idx[CPU]!, idx[GPU]!, idx[PSU]!);
}

/** Generate-and-test: enumerates the full cartesian product and checks every rule only on complete builds. */
export function bruteForce(
  problem: Problem,
  domains: number[][],
  onLeaf: (idx: Int32Array, score: number, price: number, key: number) => void,
  nodeLimit: number,
): BruteForceResult {
  const idx = new Int32Array(STATIC_ORDER.length);
  let nodes = 0;
  let capped = false;
  const enumerate = (depth: number): void => {
    if (depth === STATIC_ORDER.length) {
      if (feasible(problem, idx, problem.budget)) {
        onLeaf(idx, exactScore(problem, idx), exactPrice(problem, idx), candidateKey(problem, idx));
      }
      return;
    }
    const v = STATIC_ORDER[depth]!;
    for (const i of domains[v]!) {
      if (nodes >= nodeLimit) {
        capped = true;
        return;
      }
      nodes++;
      idx[v] = i;
      enumerate(depth + 1);
      if (capped) return;
    }
  };
  enumerate(0);
  return { nodes, capped };
}
