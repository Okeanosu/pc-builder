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
  | 'C14';

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
}

export interface Build {
  label: BuildLabel;
  parts: PartMap;
  totalPrice: number;
  score: number;
  scoreBreakdown: Partial<Record<CategoryKey, number>>;
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
}

export type InfeasibleReason = 'BUDGET_TOO_LOW' | 'NO_COMPATIBLE_COMBINATION' | 'FIXED_PART_CONFLICT';

export interface SolveResult {
  builds: Build[];
  stats: SolveStats;
  infeasibleReason?: InfeasibleReason;
  minFeasibleBudget?: number;
}
