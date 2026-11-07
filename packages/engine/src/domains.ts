import {
  CATEGORY_KEYS,
  type CaseSpecs,
  type CategoryKey,
  type CoolerSpecs,
  type CpuSpecs,
  type GpuSpecs,
  type MainboardSpecs,
  type Preferences,
  type PsuSpecs,
  type Purpose,
  type RamSpecs,
  type StorageSpecs,
} from '@pc/shared';
import { profileForRequest } from './profiles';
import {
  estimateWattage,
  lacksPsuHeadroom,
  MAX_TIER_GAP,
  minPsuWattage,
  needsM2Slot,
  PAIR_RULES,
  pairCompatible,
} from './rules';
import { cpuGpuTier, createScorer } from './scoring';
import type { EngineProduct, PartMap, PurposeProfile, SolveRequest } from './types';

/** Variable indices follow CATEGORY_KEYS so that canonical (tie-break) order is the category order. */
export const CPU = 0;
export const MAINBOARD = 1;
export const RAM = 2;
export const GPU = 3;
export const STORAGE = 4;
export const PSU = 5;
export const CASE = 6;
export const COOLER = 7;
export const VAR_COUNT = CATEGORY_KEYS.length;
/** Default static variable order: CPU → MAINBOARD → RAM → COOLER → GPU → CASE → PSU → STORAGE. */
export const STATIC_ORDER: readonly number[] = [CPU, MAINBOARD, RAM, COOLER, GPU, CASE, PSU, STORAGE];

export const BOOST_POINTS = 5;
export const COLOR_BONUS = 1.5;
export const SOFT_PENALTY = 2;
const COLOR_CATEGORIES: ReadonlySet<CategoryKey> = new Set(['case', 'cooler', 'ram', 'mainboard']);

export interface Item {
  /** `null` is the "no discrete GPU" value (office builds on an iGPU). */
  product: EngineProduct | null;
  id: string;
  price: number;
  /** MCKP value: weight × (category score + boost) + colour bonus. */
  value: number;
  /** Normalized 0..100 category score. */
  score: number;
}

export interface Problem {
  request: SolveRequest;
  purpose: Purpose;
  profile: PurposeProfile;
  budget: number;
  catalog: readonly EngineProduct[];
  /** Candidate values per variable, sorted by id (index order = canonical order). */
  items: Item[][];
  /** rel[a][b][i * |items[b]| + j] = 1 when items[a][i] and items[b][j] satisfy every hard pairwise rule. */
  rel: (Uint8Array | null)[][];
  neighbors: number[][];
  tdp: number[];
  tgp: number[];
  watt: number[];
  cpuTier: number[];
  gpuTier: number[];
  coolerRating: number[];
  hasFixed: boolean;
}

const lower = (s: string) => s.trim().toLowerCase();

export function matchesPreferences(p: EngineProduct, prefs: Preferences): boolean {
  switch (p.category) {
    case 'cpu':
      return !prefs.cpuBrand || lower(p.brand) === lower(prefs.cpuBrand);
    case 'gpu':
      return !prefs.gpuBrand || (p.specs as GpuSpecs).chipsetBrand === prefs.gpuBrand;
    case 'mainboard': {
      const s = p.specs as MainboardSpecs;
      return (!prefs.formFactor || s.formFactor === prefs.formFactor) && (!prefs.needWifi || s.wifi);
    }
    case 'ram':
      return !prefs.minRamGB || (p.specs as RamSpecs).capacityGB >= prefs.minRamGB;
    case 'storage':
      return !prefs.minStorageGB || (p.specs as StorageSpecs).capacityGB >= prefs.minStorageGB;
    default:
      return true;
  }
}

const byId = (a: EngineProduct, b: EngineProduct) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function selectCandidates(req: SolveRequest, catalog: readonly EngineProduct[]): EngineProduct[][] {
  const prefs = req.preferences ?? {};
  const exclude = new Set(req.exclude ?? []);
  const fixed = req.fixed ?? {};
  const lists: EngineProduct[][] = CATEGORY_KEYS.map(() => []);
  for (const p of catalog) {
    const v = CATEGORY_KEYS.indexOf(p.category);
    const fixedId = fixed[p.category];
    if (p.stock <= 0) continue;
    if (fixedId !== undefined) {
      if (p.id === fixedId) lists[v]!.push(p);
    } else if (!exclude.has(p.id) && matchesPreferences(p, prefs)) {
      lists[v]!.push(p);
    }
  }
  for (const list of lists) list.sort(byId);
  return lists;
}

function toItem(p: EngineProduct, req: SolveRequest, profile: PurposeProfile, score: number): Item {
  const boost = Math.min(1, Math.max(0, p.commercialBoost ?? 0));
  const color = req.preferences?.color;
  const colorMatch =
    color !== undefined &&
    COLOR_CATEGORIES.has(p.category) &&
    (p.specs as { color?: string }).color === color;
  return {
    product: p,
    id: p.id,
    price: p.price,
    value: profile.weights[p.category] * (score + BOOST_POINTS * boost) + (colorMatch ? COLOR_BONUS : 0),
    score,
  };
}

const NO_GPU: Item = { product: null, id: '', price: 0, value: 0, score: 0 };

export function buildProblem(
  req: SolveRequest,
  catalog: readonly EngineProduct[],
  baseProfile: PurposeProfile,
): Problem {
  const profile = profileForRequest(baseProfile, req.preferences);
  const scorer = createScorer(catalog, req.purpose);
  const candidates = selectCandidates(req, catalog);
  const items = candidates.map((list) => list.map((p) => toItem(p, req, profile, scorer.score(p))));
  const gpuOptional =
    req.purpose === 'office' && !req.preferences?.requireDiscreteGpu && req.fixed?.gpu === undefined;
  if (gpuOptional) items[GPU]!.unshift(NO_GPU);

  const rel: (Uint8Array | null)[][] = CATEGORY_KEYS.map(() => CATEGORY_KEYS.map(() => null));
  const neighbors: number[][] = CATEGORY_KEYS.map(() => []);
  for (const { a, b, codes } of PAIR_RULES) {
    const va = CATEGORY_KEYS.indexOf(a);
    const vb = CATEGORY_KEYS.indexOf(b);
    const A = items[va]!;
    const B = items[vb]!;
    const ab = new Uint8Array(A.length * B.length);
    const ba = new Uint8Array(A.length * B.length);
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const parts: PartMap = {};
        const pa = A[i]!.product;
        const pb = B[j]!.product;
        if (pa) parts[a] = pa;
        if (pb) parts[b] = pb;
        const ok = pairCompatible(codes, parts) ? 1 : 0;
        ab[i * B.length + j] = ok;
        ba[j * A.length + i] = ok;
      }
    }
    rel[va]![vb] = ab;
    rel[vb]![va] = ba;
    neighbors[va]!.push(vb);
    neighbors[vb]!.push(va);
  }

  const specs = <T>(v: number) => items[v]!.map((it) => it.product?.specs as T | undefined);
  return {
    request: req,
    purpose: req.purpose,
    profile,
    budget: req.budget,
    catalog,
    items,
    rel,
    neighbors,
    tdp: specs<CpuSpecs>(CPU).map((s) => s!.tdpW),
    tgp: specs<GpuSpecs>(GPU).map((s) => s?.tgpW ?? 0),
    watt: specs<PsuSpecs>(PSU).map((s) => s!.wattage),
    cpuTier: items[CPU]!.map((it) => cpuGpuTier(it.product!, catalog)),
    gpuTier: items[GPU]!.map((it) => (it.product ? cpuGpuTier(it.product, catalog) : 0)),
    coolerRating: specs<CoolerSpecs>(COOLER).map((s) => s!.tdpRatingW),
    hasFixed: Object.keys(req.fixed ?? {}).length > 0,
  };
}

export function initialDomains(problem: Problem): number[][] {
  return problem.items.map((list) => list.map((_, i) => i));
}

export function compatible(problem: Problem, a: number, i: number, b: number, j: number): boolean {
  const r = problem.rel[a]![b];
  return !r || r[i * problem.items[b]!.length + j] === 1;
}

export function psuSufficient(problem: Problem, cpu: number, gpu: number, psu: number): boolean {
  return problem.watt[psu]! >= minPsuWattage(estimateWattage(problem.tdp[cpu]!, problem.tgp[gpu]!));
}

/**
 * Soft-rule penalties (C08 headroom, C09 cooler rating, C13 tier gap) already decided by `idx`; unassigned
 * variables (index < 0) contribute nothing, which keeps this an admissible correction inside bounds.
 */
export function softPenalty(problem: Problem, idx: ArrayLike<number>): number {
  const cpu = idx[CPU]!;
  if (cpu < 0) return 0;
  const gpu = idx[GPU]!;
  const psu = idx[PSU]!;
  const cooler = idx[COOLER]!;
  const tdp = problem.tdp[cpu]!;
  let penalty = 0;
  if (gpu >= 0 && psu >= 0 && lacksPsuHeadroom(problem.watt[psu]!, estimateWattage(tdp, problem.tgp[gpu]!))) {
    penalty += SOFT_PENALTY;
  }
  if (cooler >= 0 && problem.coolerRating[cooler]! < tdp) penalty += SOFT_PENALTY;
  if (
    gpu >= 0 &&
    problem.purpose === 'gaming' &&
    problem.items[GPU]![gpu]!.product &&
    Math.abs(problem.cpuTier[cpu]! - problem.gpuTier[gpu]!) > MAX_TIER_GAP
  ) {
    penalty += SOFT_PENALTY;
  }
  return penalty;
}

/** Exact objective of a complete assignment, summed in canonical order so every strategy gets identical floats. */
export function exactScore(problem: Problem, idx: ArrayLike<number>): number {
  let sum = 0;
  for (let v = 0; v < VAR_COUNT; v++) sum += problem.items[v]![idx[v]!]!.value;
  return sum - softPenalty(problem, idx);
}

export function exactPrice(problem: Problem, idx: ArrayLike<number>): number {
  let sum = 0;
  for (let v = 0; v < VAR_COUNT; v++) sum += problem.items[v]![idx[v]!]!.price;
  return sum;
}

export function candidateKey(problem: Problem, idx: ArrayLike<number>): number {
  return idx[CPU]! * problem.items[GPU]!.length + idx[GPU]!;
}

const subset = <T>(small: readonly T[], big: readonly T[]) => small.every((x) => big.includes(x));

/**
 * `a` is at least as permissive as `b` under every hard rule touching the category, and no worse for the soft
 * penalties, so any build using `b` stays feasible (and no worse) after swapping in `a`.
 */
function atLeastAsPermissive(category: CategoryKey, a: EngineProduct, b: EngineProduct): boolean {
  switch (category) {
    case 'mainboard': {
      const x = a.specs as MainboardSpecs;
      const y = b.specs as MainboardSpecs;
      return (
        x.socket === y.socket &&
        x.memoryType === y.memoryType &&
        x.formFactor === y.formFactor &&
        x.memorySlots >= y.memorySlots &&
        x.maxMemoryGB >= y.maxMemoryGB &&
        (x.m2Slots >= 1 || y.m2Slots === 0)
      );
    }
    case 'ram': {
      const x = a.specs as RamSpecs;
      const y = b.specs as RamSpecs;
      return x.type === y.type && x.modules <= y.modules && x.capacityGB <= y.capacityGB;
    }
    case 'storage':
      return !needsM2Slot(a.specs as StorageSpecs) || needsM2Slot(b.specs as StorageSpecs);
    case 'psu': {
      const x = a.specs as PsuSpecs;
      const y = b.specs as PsuSpecs;
      return x.formFactor === y.formFactor && x.wattage >= y.wattage;
    }
    case 'case': {
      const x = a.specs as CaseSpecs;
      const y = b.specs as CaseSpecs;
      return (
        subset(y.supportedFormFactors, x.supportedFormFactors) &&
        x.maxGpuLengthMm >= y.maxGpuLengthMm &&
        x.maxCoolerHeightMm >= y.maxCoolerHeightMm &&
        subset(y.radiatorSupportMm, x.radiatorSupportMm) &&
        subset(y.psuFormFactors, x.psuFormFactors)
      );
    }
    case 'cooler': {
      const x = a.specs as CoolerSpecs;
      const y = b.specs as CoolerSpecs;
      if (x.type !== y.type || x.tdpRatingW < y.tdpRatingW || !subset(y.sockets, x.sockets)) return false;
      if (x.type === 'air') return (x.heightMm ?? 0) <= (y.heightMm ?? 0);
      return x.radiatorMm === undefined || x.radiatorMm === y.radiatorMm;
    }
    default:
      return false;
  }
}

/** Categories whose values decide build diversity (labels differ by CPU or GPU) are never pruned. */
const DOMINANCE_VARS = [MAINBOARD, RAM, STORAGE, PSU, CASE, COOLER];

/** Removes values that another value beats on value and price while being at least as compatible. */
export function pruneDominated(problem: Problem, domains: number[][]): number {
  let removed = 0;
  for (const v of DOMINANCE_VARS) {
    const items = problem.items[v]!;
    const category = CATEGORY_KEYS[v]!;
    const dom = domains[v]!;
    const kept = dom.filter((j) => {
      const b = items[j]!;
      return !dom.some((i) => {
        if (i === j) return false;
        const a = items[i]!;
        if (a.value < b.value || a.price > b.price) return false;
        if (a.value === b.value && a.price === b.price && i > j) return false;
        return atLeastAsPermissive(category, a.product!, b.product!);
      });
    });
    removed += dom.length - kept.length;
    domains[v] = kept;
  }
  return removed;
}
