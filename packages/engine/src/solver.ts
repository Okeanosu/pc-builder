import { type BuildLabel, CATEGORY_KEYS } from '@pc/shared';
import { ac3 } from './ac3';
import { bruteForce } from './bruteforce';
import { checkCompatibility } from './compatibility';
import { buildProblem, initialDomains, type Problem, pruneDominated } from './domains';
import { DEFAULT_PROFILES } from './profiles';
import { type Objective, type SearchConfig, search, type VariableOrder } from './search';
import {
  BUDGET_SCORE_RATIO,
  balancedFloor,
  byRatio,
  type Candidate,
  CandidatePool,
  type LabelledCandidate,
  labelRoles,
  MAX_BUILDS,
  selectDiverse,
} from './topk';
import type {
  Build,
  EngineProduct,
  InfeasibleReason,
  PartMap,
  PurposeProfile,
  SolveRequest,
  SolveResult,
  SolveStats,
  SolveStrategy,
} from './types';

export const DEFAULT_NODE_LIMIT = 2_000_000;
const MAX_DINKELBACH_ITERATIONS = 50;

const round = (x: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
};

class Run {
  readonly stats: SolveStats;

  constructor(
    strategy: SolveStrategy,
    private readonly nodeLimit: number,
  ) {
    this.stats = {
      strategy,
      nodesExplored: 0,
      prunedByAc3: 0,
      prunedByForwardChecking: 0,
      prunedByBound: 0,
      timeMs: 0,
      capped: false,
    };
  }

  get remaining(): number {
    return Math.max(0, this.nodeLimit - this.stats.nodesExplored);
  }

  get capped(): boolean {
    return this.stats.capped === true;
  }

  record(result: {
    nodes: number;
    capped: boolean;
    prunedByForwardChecking?: number;
    prunedByBound?: number;
  }) {
    this.stats.nodesExplored += result.nodes;
    this.stats.prunedByForwardChecking += result.prunedByForwardChecking ?? 0;
    this.stats.prunedByBound += result.prunedByBound ?? 0;
    if (result.capped) this.stats.capped = true;
  }
}

/** Dominance pruning + AC-3, i.e. the preprocessing of the `full` strategy. Null when a domain wipes out. */
function preprocess(problem: Problem, run?: Run): number[][] | null {
  const domains = initialDomains(problem);
  const dominated = pruneDominated(problem, domains);
  const { consistent, removed } = ac3(problem, domains);
  if (run) {
    run.stats.prunedByDominance = dominated;
    run.stats.prunedByAc3 = removed;
  }
  return consistent ? domains : null;
}

function branchAndBound(problem: Problem, domains: number[][], run: Run, variableOrder: VariableOrder) {
  return (cfg: Partial<SearchConfig> & { objective: Objective }): Candidate | null => {
    const result = search(problem, domains, {
      forwardChecking: true,
      variableOrder,
      branchAndBound: true,
      budget: problem.budget,
      nodeLimit: run.remaining,
      ...cfg,
    });
    run.record(result);
    return result.best;
  };
}

/** Max score/price via Dinkelbach's method: repeatedly maximise score − λ·price, λ ← ratio of the optimum. */
function bestRatio(
  solveLinear: ReturnType<typeof branchAndBound>,
  start: Candidate,
  constraints: { minScore: number; forbidden: ReadonlySet<number>; budget: number },
): Candidate | null {
  let lambda = start.score / start.price;
  let incumbent: Candidate | null = null;
  for (let i = 0; i < MAX_DINKELBACH_ITERATIONS; i++) {
    const seed = incumbent ? { ...incumbent, obj: incumbent.score - lambda * incumbent.price } : null;
    const found = solveLinear({ objective: { kind: 'linear', lambda }, ...constraints, incumbent: seed });
    if (!found || (incumbent && byRatio(found, incumbent) >= 0)) break;
    incumbent = found;
    lambda = found.score / found.price;
  }
  return incumbent;
}

/** Dominance + AC-3 + forward checking + branch & bound, one constrained search per label (see `selectDiverse`). */
function solveFull(
  problem: Problem,
  run: Run,
  topK: number,
  variableOrder: VariableOrder,
): LabelledCandidate[] {
  const domains = preprocess(problem, run);
  if (!domains) return [];
  const solveOne = branchAndBound(problem, domains, run, variableOrder);
  const performance = solveOne({ objective: { kind: 'maxScore' } });
  if (!performance) return [];
  if (topK === 1) return labelRoles(performance, null, null);

  const cap = performance.price;
  const threshold = BUDGET_SCORE_RATIO * performance.score;
  const budget = solveOne({
    objective: { kind: 'minPrice' },
    minScore: threshold,
    forbidden: new Set([performance.key]),
    budget: cap,
  });
  const used = new Set([performance.key]);
  if (budget) used.add(budget.key);
  const floor = balancedFloor(performance, budget, threshold);
  const balanced =
    bestRatio(solveOne, budget ?? performance, { minScore: floor, forbidden: used, budget: cap }) ??
    solveOne({
      objective: { kind: 'maxScore' },
      minScore: budget ? threshold : undefined,
      forbidden: used,
      budget: cap,
    });
  return labelRoles(performance, balanced, budget);
}

/** Brute force, backtracking or forward checking: enumerate every feasible build, then pick labels exactly. */
function solveExhaustive(problem: Problem, strategy: SolveStrategy, run: Run): LabelledCandidate[] {
  const pool = new CandidatePool();
  const collect = (idx: Int32Array, score: number, price: number, key: number) =>
    pool.add(idx, score, price, key);
  const domains = initialDomains(problem);
  if (strategy === 'bruteforce') {
    run.record(bruteForce(problem, domains, collect, run.remaining));
  } else {
    run.record(
      search(problem, domains, {
        forwardChecking: strategy === 'forward-checking',
        variableOrder: 'static',
        branchAndBound: false,
        budget: problem.budget,
        objective: { kind: 'maxScore' },
        onLeaf: collect,
        nodeLimit: run.remaining,
      }),
    );
  }
  return selectDiverse(pool.candidates());
}

/** Cheapest fully compatible build ignoring the budget, found with the full CSP machinery. */
function cheapestBuild(problem: Problem, nodeLimit: number): { best: Candidate | null; capped: boolean } {
  const domains = preprocess(problem);
  if (!domains) return { best: null, capped: false };
  return search(problem, domains, {
    forwardChecking: true,
    variableOrder: 'weighted',
    branchAndBound: true,
    budget: Number.POSITIVE_INFINITY,
    objective: { kind: 'minPrice' },
    nodeLimit,
  });
}

type Diagnosis = { infeasibleReason: InfeasibleReason; minFeasibleBudget?: number };

function diagnose(
  problem: Problem,
  catalog: readonly EngineProduct[],
  profile: PurposeProfile,
  nodeLimit: number,
): Diagnosis {
  const cheapest = cheapestBuild(problem, nodeLimit);
  if (cheapest.best) {
    // A capped search proves a build exists (so the budget is the problem) but not that it is the cheapest.
    return cheapest.capped
      ? { infeasibleReason: 'BUDGET_TOO_LOW' }
      : { infeasibleReason: 'BUDGET_TOO_LOW', minFeasibleBudget: cheapest.best.price };
  }
  if (cheapest.capped) return { infeasibleReason: 'SEARCH_LIMIT' };
  if (problem.hasFixed) {
    const relaxed = cheapestBuild(
      buildProblem({ ...problem.request, fixed: undefined }, catalog, profile),
      nodeLimit,
    );
    if (relaxed.best) return { infeasibleReason: 'FIXED_PART_CONFLICT' };
    if (relaxed.capped) return { infeasibleReason: 'SEARCH_LIMIT' };
  }
  return { infeasibleReason: 'NO_COMPATIBLE_COMBINATION' };
}

function toBuild(problem: Problem, candidate: Candidate, label: BuildLabel): Build {
  const parts: PartMap = {};
  const scoreBreakdown: Build['scoreBreakdown'] = {};
  const allocation: Build['allocation'] = {};
  CATEGORY_KEYS.forEach((category, v) => {
    const item = problem.items[v]![candidate.idx[v]!]!;
    if (!item.product) return;
    parts[category] = item.product;
    scoreBreakdown[category] = round(item.score, 1);
    allocation[category] = round(item.price / candidate.price, 4);
  });
  const report = checkCompatibility(parts, {
    purpose: problem.purpose,
    budget: problem.budget,
    catalog: problem.catalog,
  });
  return {
    label,
    parts,
    totalPrice: candidate.price,
    score: round(candidate.score, 2),
    scoreBreakdown,
    allocation,
    estimatedWattage: report.estimatedWattage,
    recommendedPsuWattage: report.recommendedPsuWattage,
    // Under-spending is the point of the cheaper alternatives, so only the performance build is told about it.
    warnings: report.issues.filter(
      (i) => label === 'performance' || !(i.code === 'C14' && i.severity === 'warning'),
    ),
  };
}

/**
 * Recommends up to three diverse, compatible, in-budget builds (performance / balanced / budget) from the in-stock
 * catalog. Pure: no I/O; deterministic for a given input.
 */
export function solve(req: SolveRequest, catalog: EngineProduct[], profile?: PurposeProfile): SolveResult {
  return solveWithOptions(req, catalog, profile);
}

export interface SolverOptions {
  /** Variable ordering of the `full` strategy; `weighted` by default, `mrv` kept for the benchmark ablation. */
  variableOrder?: VariableOrder;
}

/** `solve` with tuning knobs that are not part of the public request contract (used by the benchmark). */
export function solveWithOptions(
  req: SolveRequest,
  catalog: EngineProduct[],
  profile?: PurposeProfile,
  options: SolverOptions = {},
): SolveResult {
  const started = performance.now();
  const strategy = req.strategy ?? 'full';
  const baseProfile = profile ?? DEFAULT_PROFILES[req.purpose];
  const nodeLimit = req.nodeLimit ?? DEFAULT_NODE_LIMIT;
  const topK = Math.min(MAX_BUILDS, Math.max(1, Math.floor(req.topK ?? MAX_BUILDS)));
  const problem = buildProblem(req, catalog, baseProfile);
  const run = new Run(strategy, nodeLimit);

  const picks =
    strategy === 'full'
      ? solveFull(problem, run, topK, options.variableOrder ?? 'weighted')
      : solveExhaustive(problem, strategy, run);
  const builds = picks.slice(0, topK).map(({ candidate, label }) => toBuild(problem, candidate, label));
  let diagnosis: Diagnosis | undefined;
  if (builds.length === 0) {
    diagnosis = run.capped
      ? { infeasibleReason: 'SEARCH_LIMIT' }
      : diagnose(problem, catalog, baseProfile, nodeLimit);
  }

  run.stats.timeMs = round(performance.now() - started, 3);
  return { builds, stats: run.stats, ...diagnosis };
}
