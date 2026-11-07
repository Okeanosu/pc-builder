import { CATEGORY_KEYS, type CategoryKey } from '@pc/shared';
import type { WeightsInput } from '../api';
import { formatWeight } from '../format';

/** Same tolerance as the API's weight check. */
export const SUM_TOLERANCE = 0.001;

export interface WeightProfile {
  weights: Record<CategoryKey, number>;
  allocation: Record<CategoryKey, { min: number; max: number }>;
}

export interface WeightDraft {
  weights: Record<CategoryKey, string>;
  allocation: Record<CategoryKey, { min: string; max: string }>;
}

const two = (n: number) => n.toFixed(2);

export function toWeightDraft(p: WeightProfile): WeightDraft {
  const weights = {} as WeightDraft['weights'];
  const allocation = {} as WeightDraft['allocation'];
  for (const k of CATEGORY_KEYS) {
    weights[k] = two(p.weights[k] ?? 0);
    allocation[k] = { min: two(p.allocation[k]?.min ?? 0), max: two(p.allocation[k]?.max ?? 0) };
  }
  return { weights, allocation };
}

/** A share of the whole: 0..1, up to two decimals, "0,42" or "0.42". */
export function parseShare(text: string): number | 'invalid' {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return 'invalid';
  const n = Number(t);
  return n >= 0 && n <= 1 ? n : 'invalid';
}

const SHARE_ERROR = 'Nhập số từ 0 đến 1, tối đa 2 chữ số thập phân';

export interface WeightCheck {
  sum: number;
  sumOk: boolean;
  cellErrors: Record<string, string>;
  input: WeightsInput | null;
}

export function checkWeights(draft: WeightDraft): WeightCheck {
  const cellErrors: Record<string, string> = {};
  const weights = {} as WeightsInput['weights'];
  const allocation = {} as WeightsInput['allocation'];
  let sum = 0;
  for (const k of CATEGORY_KEYS) {
    const w = parseShare(draft.weights[k]);
    if (w === 'invalid') cellErrors[`weights.${k}`] = SHARE_ERROR;
    else {
      weights[k] = w;
      sum += w;
    }
    const min = parseShare(draft.allocation[k].min);
    const max = parseShare(draft.allocation[k].max);
    if (min === 'invalid') cellErrors[`allocation.${k}.min`] = SHARE_ERROR;
    if (max === 'invalid') cellErrors[`allocation.${k}.max`] = SHARE_ERROR;
    if (min !== 'invalid' && max !== 'invalid') {
      if (min > max) cellErrors[`allocation.${k}`] = 'Tỷ lệ tối thiểu không được lớn hơn tối đa';
      allocation[k] = { min, max };
    }
  }
  // Sum of two-decimal values: round away float noise before comparing.
  sum = Math.round(sum * 1000) / 1000;
  const sumOk = Math.abs(sum - 1) <= SUM_TOLERANCE;
  const ok = sumOk && Object.keys(cellErrors).length === 0;
  return { sum, sumOk, cellErrors, input: ok ? { weights, allocation } : null };
}

export function sumHint(sum: number): string | null {
  const diff = Math.round((1 - sum) * 100) / 100;
  if (Math.abs(1 - sum) <= SUM_TOLERANCE) return null;
  return diff > 0
    ? `Thêm ${formatWeight(diff)} để tổng bằng 1,00`
    : `Bớt ${formatWeight(-diff)} để tổng bằng 1,00`;
}

export function isWeightDraftDirty(draft: WeightDraft, saved: WeightProfile): boolean {
  const same = (text: string, value: number) => {
    const n = parseShare(text);
    return n !== 'invalid' && Math.abs(n - value) < 1e-9;
  };
  return CATEGORY_KEYS.some(
    (k) =>
      !same(draft.weights[k], saved.weights[k] ?? 0) ||
      !same(draft.allocation[k].min, saved.allocation[k]?.min ?? 0) ||
      !same(draft.allocation[k].max, saved.allocation[k]?.max ?? 0),
  );
}
