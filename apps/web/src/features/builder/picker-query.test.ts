import { describe, expect, it } from 'vitest';
import { PICKER_PAGE_SIZE, pickerSearchParams, toggleFacetValue } from './picker-query';

describe('pickerSearchParams', () => {
  it('always asks for in-stock items of the category, one page at a time', () => {
    const p = pickerSearchParams({ category: 'cpu', q: '  ', sort: 'price_asc', specs: {} }, 2);
    expect(p.get('category')).toBe('cpu');
    expect(p.get('inStock')).toBe('true');
    expect(p.get('page')).toBe('2');
    expect(p.get('pageSize')).toBe(String(PICKER_PAGE_SIZE));
    expect(p.has('q')).toBe(false);
  });

  it('encodes facets as specs[key]=v1,v2 and skips empty ones', () => {
    const p = pickerSearchParams(
      { category: 'cpu', q: 'ryzen', sort: 'performance', specs: { socket: ['AM5', 'AM4'], cores: [] } },
      1,
    );
    expect(p.get('q')).toBe('ryzen');
    expect(p.get('specs[socket]')).toBe('AM5,AM4');
    expect(p.has('specs[cores]')).toBe(false);
  });
});

describe('toggleFacetValue', () => {
  it('adds, then removes, and drops the key when empty', () => {
    const a = toggleFacetValue({}, 'socket', 'AM5');
    expect(a).toEqual({ socket: ['AM5'] });
    const b = toggleFacetValue(a, 'socket', 'AM4');
    expect(b).toEqual({ socket: ['AM5', 'AM4'] });
    expect(toggleFacetValue({ socket: ['AM5'] }, 'socket', 'AM5')).toEqual({});
  });
});
