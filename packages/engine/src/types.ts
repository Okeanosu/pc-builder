import type { AnySpecs, Benchmark, BuildLabel, CategoryKey, Preferences, Purpose } from '@pc/shared';

export interface EngineProduct {
  id: string;
  category: CategoryKey;
  name: string;
  brand: string;
  price: number;
  stock: number;
  specs: AnySpecs;
  benchmark?: Benchmark;
  /** Admin-set merchandising nudge, 0..1, added to the normalized score with a small weight. */
  commercialBoost?: number;
}

export type PartMap = Partial<Record<CategoryKey, EngineProduct>>;

export type RuleCode =
  | 'C01'
  | 'C02'
  | 'C03'
  | 'C04'
  | 'C05'
  | 'C06'
  | 'C07'
  | 'C08'
  | 'C09'
  | 'C10'
  | 'C11'
  | 'C12'
  | 'C13'
  | 'C14'
  | 'C15';

export interface CompatibilityIssue {
  code: RuleCode;
  severity: 'error' | 'warning';
  message: string;
  categories: CategoryKey[];
}

export interface CompatibilityReport {
  issues: CompatibilityIssue[];
  estimatedWattage: number;
  recommendedPsuWattage: number;
}

/** Optional context: C13 needs `purpose: 'gaming'` + a reference `catalog` for tiers; C14 needs `budget`. */
export interface CompatibilityContext {
  purpose?: Purpose;
  budget?: number;
  catalog?: readonly EngineProduct[];
}

export interface PurposeProfile {
  purpose: Purpose;
  weights: Record<CategoryKey, number>;
  allocation: Record<CategoryKey, { min: number; max: number }>;
}

export type SolveStrategy = 'bruteforce' | 'backtracking' | 'forward-checking' | 'full';

export interface SolveRequest {
  budget: number;
  purpose: Purpose;
  preferences?: Preferences;
  fixed?: Partial<Record<CategoryKey, string>>;
  exclude?: string[];
  topK?: number;
  strategy?: SolveStrategy;
  /** Safety cap on search nodes (all strategies); a capped run returns its best-so-far builds. */
  nodeLimit?: number;
}

export interface Build {
  label: BuildLabel;
  parts: PartMap;
  totalPrice: number;
  /** Σ weight × category score (+ small boost/colour bonuses, − soft-warning penalties); roughly 0..100. */
  score: number;
  /** Per-category normalized score, 0..100. */
  scoreBreakdown: Partial<Record<CategoryKey, number>>;
  /** Share of total price per category, 0..1. */
  allocation: Partial<Record<CategoryKey, number>>;
  estimatedWattage: number;
  recommendedPsuWattage: number;
  warnings: CompatibilityIssue[];
}

export interface SolveStats {
  strategy: SolveStrategy;
  nodesExplored: number;
  prunedByAc3: number;
  prunedByForwardChecking: number;
  prunedByBound: number;
  timeMs: number;
  /** Values removed by dominance pruning before search (`full` only). */
  prunedByDominance?: number;
  /** True when the node limit stopped the search early, so the builds may be sub-optimal. */
  capped?: boolean;
}

/** `SEARCH_LIMIT`: the node limit stopped the search before any build (or a proof of infeasibility) was found. */
export type InfeasibleReason =
  | 'BUDGET_TOO_LOW'
  | 'NO_COMPATIBLE_COMBINATION'
  | 'FIXED_PART_CONFLICT'
  | 'SEARCH_LIMIT';

export interface SolveResult {
  builds: Build[];
  stats: SolveStats;
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
}
