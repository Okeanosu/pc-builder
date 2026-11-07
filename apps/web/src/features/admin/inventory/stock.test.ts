import { describe, expect, it } from 'vitest';
import { checkAdjust, stockLevel } from './stock';

const current = { stockOnHand: 10, reserved: 3 };

describe('stockLevel', () => {
  it('flags out-of-stock and the low-stock band', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(3)).toBe('low');
    expect(stockLevel(4)).toBe('ok');
  });
});

describe('checkAdjust', () => {
  it('accepts an import with a note and previews the new stock', () => {
    expect(checkAdjust({ reason: 'IMPORT', delta: '+5', note: ' Lô tháng 11 ' }, current)).toEqual({
      input: { delta: 5, reason: 'IMPORT', note: 'Lô tháng 11' },
      error: null,
      after: 15,
    });
  });

  it('allows a negative manual adjustment and omits an empty note', () => {
    expect(checkAdjust({ reason: 'ADJUST', delta: '-2', note: '' }, current).input).toEqual({
      delta: -2,
      reason: 'ADJUST',
    });
  });

  it('stays quiet while the field is empty', () => {
    expect(checkAdjust({ reason: 'IMPORT', delta: '', note: '' }, current)).toEqual({
      input: null,
      error: null,
      after: null,
    });
  });

  it('refuses zero, decimals, negative imports and dropping below reserved units', () => {
    expect(checkAdjust({ reason: 'ADJUST', delta: '0', note: '' }, current).error).toContain('khác 0');
    expect(checkAdjust({ reason: 'ADJUST', delta: '1.5', note: '' }, current).error).toContain('số nguyên');
    expect(checkAdjust({ reason: 'IMPORT', delta: '-1', note: '' }, current).error).toContain('số dương');
    const below = checkAdjust({ reason: 'ADJUST', delta: '-8', note: '' }, current);
    expect(below.error).toContain('3 sản phẩm đang giữ');
    expect(below.after).toBe(2);
  });
});
