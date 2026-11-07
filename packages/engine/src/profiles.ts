import { CATEGORY_KEYS, type CategoryKey, type Preferences, type Purpose } from '@pc/shared';
import type { PurposeProfile } from './types';

const ALLOCATION_SPREAD = 0.08;

const WEIGHTS: Record<Purpose, Record<CategoryKey, number>> = {
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

const round4 = (x: number) => Math.round(x * 10_000) / 10_000;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function buildProfile(purpose: Purpose): PurposeProfile {
  const weights = WEIGHTS[purpose];
  const allocation = {} as PurposeProfile['allocation'];
  for (const c of CATEGORY_KEYS) {
    const w = weights[c];
    allocation[c] =
      w === 0
        ? { min: 0, max: 0 }
        : { min: round4(clamp01(w - ALLOCATION_SPREAD)), max: round4(clamp01(w + ALLOCATION_SPREAD)) };
  }
  return { purpose, weights: { ...weights }, allocation };
}

export const DEFAULT_PROFILES: Record<Purpose, PurposeProfile> = {
  gaming: buildProfile('gaming'),
  graphics: buildProfile('graphics'),
  ai: buildProfile('ai'),
  office: buildProfile('office'),
};

// Higher resolutions are GPU-bound, so the CPU share moves to the GPU.
const RESOLUTION_GPU_SHIFT: Record<NonNullable<Preferences['resolution']>, number> = {
  '1080p': 0,
  '1440p': 0.04,
  '4k': 0.08,
};

/** Applies request-level tweaks (resolution) to a purpose profile without mutating it. */
export function profileForRequest(
  profile: PurposeProfile,
  preferences: Preferences | undefined,
): PurposeProfile {
  const resolution = preferences?.resolution;
  if (profile.purpose !== 'gaming' || !resolution) return profile;
  const shift = Math.min(RESOLUTION_GPU_SHIFT[resolution], profile.weights.cpu);
  if (shift === 0) return profile;
  const move = (range: { min: number; max: number }, delta: number) => ({
    min: round4(clamp01(range.min + delta)),
    max: round4(clamp01(range.max + delta)),
  });
  return {
    purpose: profile.purpose,
    weights: {
      ...profile.weights,
      cpu: round4(profile.weights.cpu - shift),
      gpu: round4(profile.weights.gpu + shift),
    },
    allocation: {
      ...profile.allocation,
      cpu: move(profile.allocation.cpu, -shift),
      gpu: move(profile.allocation.gpu, shift),
    },
  };
}
