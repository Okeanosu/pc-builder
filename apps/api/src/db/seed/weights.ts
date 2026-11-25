import { CATEGORY_KEYS, type CategoryKey, PURPOSES, type Purpose } from '@pc/shared';

type Weights = Record<CategoryKey, number>;

export const PURPOSE_WEIGHTS: Record<Purpose, Weights> = {
  gaming: {
    gpu: 0.42,
    cpu: 0.22,
    ram: 0.1,
    storage: 0.07,
    mainboard: 0.07,
    psu: 0.05,
    case: 0.04,
    cooler: 0.03,
  },
  graphics: {
    cpu: 0.32,
    gpu: 0.28,
    ram: 0.16,
    storage: 0.1,
    mainboard: 0.06,
    psu: 0.04,
    case: 0.02,
    cooler: 0.02,
  },
  ai: {
    gpu: 0.48,
    ram: 0.16,
    cpu: 0.14,
    storage: 0.08,
    mainboard: 0.06,
    psu: 0.05,
    case: 0.02,
    cooler: 0.01,
  },
  office: { cpu: 0.35, ram: 0.2, storage: 0.2, mainboard: 0.12, psu: 0.06, case: 0.05, cooler: 0.02, gpu: 0 },
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function allocationFor(weights: Weights): Record<CategoryKey, { min: number; max: number }> {
  const out = {} as Record<CategoryKey, { min: number; max: number }>;
  for (const key of CATEGORY_KEYS) {
    const w = weights[key];
    out[key] =
      w === 0 ? { min: 0, max: 0 } : { min: round3(clamp01(w - 0.08)), max: round3(clamp01(w + 0.08)) };
  }
  return out;
}

export const WEIGHT_ROWS = PURPOSES.map((purpose) => ({
  purpose,
  weights: PURPOSE_WEIGHTS[purpose],
  allocation: allocationFor(PURPOSE_WEIGHTS[purpose]),
}));
