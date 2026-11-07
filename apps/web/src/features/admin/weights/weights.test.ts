import { DEFAULT_PROFILES } from '@pc/engine';
import { CATEGORY_KEYS } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { checkWeights, isWeightDraftDirty, parseShare, sumHint, toWeightDraft } from './weights';

const gaming = DEFAULT_PROFILES.gaming;

describe('parseShare', () => {
  it('accepts 0..1 with at most two decimals, dot or comma', () => {
    expect(parseShare('0.42')).toBe(0.42);
    expect(parseShare('0,4')).toBe(0.4);
    expect(parseShare('1')).toBe(1);
    expect(parseShare('')).toBe('invalid');
    expect(parseShare('0.425')).toBe('invalid');
    expect(parseShare('1.2')).toBe('invalid');
    expect(parseShare('-0.1')).toBe('invalid');
  });
});

describe('toWeightDraft', () => {
  it('shows every weight and allocation bound with two decimals', () => {
    const draft = toWeightDraft(gaming);
    expect(draft.weights.gpu).toBe('0.42');
    expect(draft.weights.cooler).toBe('0.03');
    expect(draft.allocation.gpu).toEqual({ min: '0.34', max: '0.50' });
    expect(Object.keys(draft.weights)).toEqual([...CATEGORY_KEYS]);
  });
});

describe('checkWeights', () => {
  it('passes the engine defaults (sum 1.00) and returns numbers for the API', () => {
    const result = checkWeights(toWeightDraft(gaming));
    expect(result.sumOk).toBe(true);
    expect(result.sum).toBeCloseTo(1, 6);
    expect(result.input?.weights).toEqual(gaming.weights);
    expect(result.input?.allocation.gpu).toEqual({ min: 0.34, max: 0.5 });
  });

  it('blocks saving when the sum drifts beyond 1.00 ± 0.001', () => {
    const draft = toWeightDraft(gaming);
    draft.weights.gpu = '0.39';
    const result = checkWeights(draft);
    expect(result.sumOk).toBe(false);
    expect(result.sum).toBeCloseTo(0.97, 6);
    expect(result.input).toBeNull();
  });

  it('tolerates float noise from many two-decimal additions', () => {
    const draft = toWeightDraft(gaming);
    for (const k of CATEGORY_KEYS) draft.weights[k] = '0.10';
    draft.weights.gpu = '0.30';
    expect(checkWeights(draft).sumOk).toBe(true);
  });

  it('flags unreadable cells and min > max per category', () => {
    const draft = toWeightDraft(gaming);
    draft.weights.cpu = 'abc';
    draft.allocation.ram = { min: '0.30', max: '0.10' };
    draft.allocation.psu = { min: '', max: '0.10' };
    const result = checkWeights(draft);
    expect(result.input).toBeNull();
    expect(result.cellErrors).toEqual({
      'weights.cpu': expect.any(String),
      'allocation.ram': expect.stringContaining('tối thiểu'),
      'allocation.psu.min': expect.any(String),
    });
  });
});

describe('sumHint', () => {
  it('says how much to add or remove', () => {
    expect(sumHint(0.97)).toBe('Thêm 0,03 để tổng bằng 1,00');
    expect(sumHint(1.05)).toBe('Bớt 0,05 để tổng bằng 1,00');
    expect(sumHint(1)).toBeNull();
  });
});

describe('isWeightDraftDirty', () => {
  it('compares parsed values, not text', () => {
    const draft = toWeightDraft(gaming);
    expect(isWeightDraftDirty(draft, gaming)).toBe(false);
    draft.weights.gpu = '0,42';
    expect(isWeightDraftDirty(draft, gaming)).toBe(false);
    draft.allocation.cpu = { min: '0.10', max: '0.30' };
    expect(isWeightDraftDirty(draft, gaming)).toBe(true);
  });
});
