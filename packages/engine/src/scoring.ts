import type {
  CategoryKey,
  CoolerSpecs,
  CpuSpecs,
  GpuSpecs,
  MainboardSpecs,
  Preferences,
  PsuSpecs,
  Purpose,
  RamSpecs,
  StorageSpecs,
} from '@pc/shared';
import type { EngineProduct } from './types';

interface Refs {
  single: number;
  multi: number;
  gpu: number;
  vram: number;
  ramSpeed: number;
  read: number;
  coolerTdp: number;
}

/** Sub-weights per purpose: gaming favours single-core + raster, graphics multi-core + VRAM, AI VRAM + RAM. */
const CPU_MIX: Record<Purpose, [single: number, multi: number]> = {
  gaming: [0.7, 0.3],
  graphics: [0.25, 0.75],
  ai: [0.4, 0.6],
  office: [0.6, 0.4],
};
const GPU_MIX: Record<Purpose, [raster: number, vram: number]> = {
  gaming: [0.9, 0.1],
  graphics: [0.6, 0.4],
  ai: [0.35, 0.65],
  office: [1, 0],
};
// Sufficiency references: capacity / speed beyond these brings no noticeable gain for the purpose, so the budget
// goes to the CPU/GPU instead (DDR5-6000 is the sweet spot; PCIe 5 reads only help nobody here).
const RAM_SPEED_CAP_MHZ = 6000;
const RAM_MIX: Record<Purpose, { capRefGB: number; cap: number; speed: number }> = {
  gaming: { capRefGB: 32, cap: 0.55, speed: 0.45 },
  graphics: { capRefGB: 64, cap: 0.75, speed: 0.25 },
  ai: { capRefGB: 64, cap: 0.8, speed: 0.2 },
  office: { capRefGB: 16, cap: 0.6, speed: 0.4 },
};
const STORAGE_MIX: Record<Purpose, { capRefGB: number; cap: number; read: number; readCapMBps: number }> = {
  gaming: { capRefGB: 1000, cap: 0.5, read: 0.5, readCapMBps: 5000 },
  graphics: { capRefGB: 4000, cap: 0.55, read: 0.45, readCapMBps: 7500 },
  ai: { capRefGB: 2000, cap: 0.5, read: 0.5, readCapMBps: 7500 },
  office: { capRefGB: 500, cap: 0.5, read: 0.5, readCapMBps: 3500 },
};

/** CUDA dominates AI frameworks and GPU render engines, so non-NVIDIA cards are worth less for those purposes. */
export const CUDA_ECOSYSTEM_FACTOR: Record<Purpose, number> = {
  gaming: 1,
  graphics: 0.8,
  ai: 0.55,
  office: 1,
};

// Rough Cinebench R23 / Time Spy estimates for products imported without benchmark data.
const cpuSingle = (p: EngineProduct) => p.benchmark?.cpuSingle ?? (p.specs as CpuSpecs).boostClockGHz * 360;
const cpuMulti = (p: EngineProduct) => {
  const s = p.specs as CpuSpecs;
  return p.benchmark?.cpuMulti ?? s.threads * s.boostClockGHz * 225;
};
const gpuPerf = (p: EngineProduct) => p.benchmark?.gpuScore ?? (p.specs as GpuSpecs).tgpW * 70;

const ratio = (value: number, max: number) => (max > 0 ? Math.min(1, value / max) : 0);

function efficiencyTier(efficiency: string): number {
  const e = efficiency.toLowerCase();
  if (e.includes('titanium')) return 1;
  if (e.includes('platinum')) return 0.85;
  if (e.includes('gold')) return 0.7;
  if (e.includes('silver')) return 0.5;
  if (e.includes('bronze')) return 0.3;
  return 0;
}

function computeRefs(items: readonly EngineProduct[]): Refs {
  const refs: Refs = {
    single: 0,
    multi: 0,
    gpu: 0,
    vram: 0,
    ramSpeed: 0,
    read: 0,
    coolerTdp: 0,
  };
  for (const p of items) {
    if (p.category === 'cpu') {
      refs.single = Math.max(refs.single, cpuSingle(p));
      refs.multi = Math.max(refs.multi, cpuMulti(p));
    } else if (p.category === 'gpu') {
      refs.gpu = Math.max(refs.gpu, gpuPerf(p));
      refs.vram = Math.max(refs.vram, (p.specs as GpuSpecs).vramGB);
    } else if (p.category === 'ram') {
      refs.ramSpeed = Math.max(refs.ramSpeed, (p.specs as RamSpecs).speedMHz);
    } else if (p.category === 'storage') {
      refs.read = Math.max(refs.read, (p.specs as StorageSpecs).readMBps);
    } else if (p.category === 'cooler') {
      refs.coolerTdp = Math.max(refs.coolerTdp, (p.specs as CoolerSpecs).tdpRatingW);
    }
  }
  return refs;
}

function rawPerformance(p: EngineProduct, purpose: Purpose, refs: Refs): number {
  switch (p.category) {
    case 'cpu': {
      const [ws, wm] = CPU_MIX[purpose];
      return ws * ratio(cpuSingle(p), refs.single) + wm * ratio(cpuMulti(p), refs.multi);
    }
    case 'gpu': {
      const [wg, wv] = GPU_MIX[purpose];
      return wg * ratio(gpuPerf(p), refs.gpu) + wv * ratio((p.specs as GpuSpecs).vramGB, refs.vram);
    }
    case 'ram': {
      const s = p.specs as RamSpecs;
      const mix = RAM_MIX[purpose];
      const speedRef = Math.min(refs.ramSpeed, RAM_SPEED_CAP_MHZ);
      return mix.cap * ratio(s.capacityGB, mix.capRefGB) + mix.speed * ratio(s.speedMHz, speedRef);
    }
    case 'storage': {
      const s = p.specs as StorageSpecs;
      const mix = STORAGE_MIX[purpose];
      const readRef = Math.min(refs.read, mix.readCapMBps);
      return mix.cap * ratio(s.capacityGB, mix.capRefGB) + mix.read * ratio(s.readMBps, readRef);
    }
    // Supporting parts are scored on sufficiency: their hard fit is enforced by rules, so money above "enough"
    // should go to performance parts instead.
    case 'mainboard': {
      const s = p.specs as MainboardSpecs;
      const memoryRefGB = purpose === 'ai' || purpose === 'graphics' ? 128 : 64;
      return (
        0.7 +
        0.1 * ratio(s.m2Slots, 2) +
        0.1 * ratio(s.memorySlots, 4) +
        0.1 * ratio(s.maxMemoryGB, memoryRefGB)
      );
    }
    case 'psu': {
      // Wattage adequacy is C08 (hard minimum + headroom penalty), so watts beyond it earn nothing.
      const s = p.specs as PsuSpecs;
      return 0.85 + 0.12 * efficiencyTier(s.efficiency) + 0.03 * (s.modular ? 1 : 0);
    }
    case 'case':
      return 1;
    case 'cooler': {
      // Adequacy (rating ≥ cpu TDP) is the C09 penalty; extra rating is only a small headroom bonus.
      return 0.92 + 0.08 * ratio((p.specs as CoolerSpecs).tdpRatingW, refs.coolerTdp);
    }
  }
}

export interface Scorer {
  /** 0..100, relative to the best product of the same category in the reference catalog. */
  score(p: EngineProduct): number;
}

const scorerCache = new WeakMap<readonly EngineProduct[], Map<Purpose, Scorer>>();

export function createScorer(catalog: readonly EngineProduct[], purpose: Purpose): Scorer {
  let byPurpose = scorerCache.get(catalog);
  const cached = byPurpose?.get(purpose);
  if (cached) return cached;

  const refs = computeRefs(catalog);
  const maxRaw = new Map<CategoryKey, number>();
  for (const p of catalog) {
    maxRaw.set(p.category, Math.max(maxRaw.get(p.category) ?? 0, rawPerformance(p, purpose, refs)));
  }
  const scorer: Scorer = {
    score(p) {
      const raw = rawPerformance(p, purpose, refs);
      const max = maxRaw.get(p.category) ?? 0;
      if (raw >= max) return raw > 0 ? 100 : 0;
      return Math.min(100, (100 * raw) / max);
    },
  };
  if (!byPurpose) {
    byPurpose = new Map();
    scorerCache.set(catalog, byPurpose);
  }
  byPurpose.set(purpose, scorer);
  return scorer;
}

export function scoreProduct(p: EngineProduct, purpose: Purpose, catalog: readonly EngineProduct[]): number {
  return createScorer(catalog, purpose).score(p);
}

/** Recommendation-time multiplier on a GPU's score; an explicit `gpuBrand` preference switches it off. */
export function ecosystemFactor(
  p: EngineProduct,
  purpose: Purpose,
  preferences: Preferences | undefined,
): number {
  if (p.category !== 'gpu' || preferences?.gpuBrand || (p.specs as GpuSpecs).chipsetBrand === 'NVIDIA')
    return 1;
  return CUDA_ECOSYSTEM_FACTOR[purpose];
}

export type Tier = 1 | 2 | 3 | 4 | 5;

/** Purpose-neutral performance used for tiers: CPU = mean of single/multi, GPU = raster score. */
function tierRaw(p: EngineProduct, refs: Refs): number {
  if (p.category === 'cpu')
    return 0.5 * ratio(cpuSingle(p), refs.single) + 0.5 * ratio(cpuMulti(p), refs.multi);
  if (p.category === 'gpu') return ratio(gpuPerf(p), refs.gpu);
  return rawPerformance(p, 'gaming', refs);
}

const tierCache = new WeakMap<readonly EngineProduct[], { refs: Refs; sorted: Map<CategoryKey, number[]> }>();

/** Quintile of the product's mid-rank percentile within its category (1 = slowest fifth, 5 = fastest). */
export function cpuGpuTier(p: EngineProduct, catalog: readonly EngineProduct[]): Tier {
  let entry = tierCache.get(catalog);
  if (!entry) {
    const refs = computeRefs(catalog);
    const sorted = new Map<CategoryKey, number[]>();
    for (const item of catalog) {
      const list = sorted.get(item.category) ?? [];
      list.push(tierRaw(item, refs));
      sorted.set(item.category, list);
    }
    entry = { refs, sorted };
    tierCache.set(catalog, entry);
  }
  const values = entry.sorted.get(p.category) ?? [];
  if (values.length === 0) return 3;
  const raw = tierRaw(p, entry.refs);
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < raw) below++;
    else if (v === raw) equal++;
  }
  const percentile = (below + equal / 2) / values.length;
  return Math.min(5, 1 + Math.floor(5 * percentile)) as Tier;
}
