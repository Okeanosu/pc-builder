import { describe, expect, it } from 'vitest';
import {
  clearFilters,
  countActiveFilters,
  EMPTY_QUERY,
  pageWindow,
  parseListingParams,
  queryString,
  setCategory,
  setPage,
  setPriceRange,
  setSpecRange,
  toApiSearch,
  toggleBrand,
  toggleSpecValue,
  toSearchParams,
} from './listing-query';

describe('parseListingParams', () => {
  it('reads backend-named params from URLSearchParams', () => {
    const q = parseListingParams(
      new URLSearchParams(
        'q=rtx&brand=ASUS,MSI&minPrice=5000000&maxPrice=20000000&inStock=true&specs[chipsetBrand]=NVIDIA,AMD&specsMin[vramGB]=12&specsMax[vramGB]=24&sort=price_asc&page=3',
      ),
    );
    expect(q).toEqual({
      q: 'rtx',
      brand: ['ASUS', 'MSI'],
      minPrice: 5_000_000,
      maxPrice: 20_000_000,
      inStock: true,
      specs: { chipsetBrand: ['NVIDIA', 'AMD'] },
      specsMin: { vramGB: 12 },
      specsMax: { vramGB: 24 },
      sort: 'price_asc',
      page: 3,
    });
  });

  it('reads the Next.js searchParams record shape, merging repeated keys', () => {
    const q = parseListingParams({ 'specs[socket]': ['AM5', 'AM4'], brand: 'AMD', page: undefined });
    expect(q.specs).toEqual({ socket: ['AM5', 'AM4'] });
    expect(q.brand).toEqual(['AMD']);
    expect(q.page).toBe(1);
  });

  it('reads a known category only', () => {
    expect(parseListingParams(new URLSearchParams('category=gpu')).category).toBe('gpu');
    expect(parseListingParams(new URLSearchParams('category=phone')).category).toBeUndefined();
  });

  it('drops malformed values instead of throwing', () => {
    const q = parseListingParams(
      new URLSearchParams(
        'minPrice=abc&maxPrice=-5&page=0&sort=cheapest&specs[__proto__]=x&specsMin[cores]=lots&inStock=yes',
      ),
    );
    expect(q).toEqual(EMPTY_QUERY);
  });

  it('ignores empty list entries and duplicate values', () => {
    const q = parseListingParams(new URLSearchParams('specs[type]=DDR5,,DDR5&brand=,'));
    expect(q.specs).toEqual({ type: ['DDR5'] });
    expect(q.brand).toEqual([]);
  });
});

describe('toSearchParams', () => {
  it('omits defaults so an unfiltered listing has a clean URL', () => {
    expect(toSearchParams(EMPTY_QUERY).toString()).toBe('');
    expect(queryString(EMPTY_QUERY)).toBe('');
  });

  it('is order-independent: the same filters give the same string', () => {
    const a = toggleSpecValue(toggleSpecValue(EMPTY_QUERY, 'socket', 'AM5'), 'socket', 'AM4');
    const b = toggleSpecValue(toggleSpecValue(EMPTY_QUERY, 'socket', 'AM4'), 'socket', 'AM5');
    expect(toSearchParams(a).toString()).toBe(toSearchParams(b).toString());
  });

  it('round-trips through parseListingParams', () => {
    const q = {
      ...EMPTY_QUERY,
      q: 'ryzen 7',
      brand: ['AMD'],
      minPrice: 1_000_000,
      inStock: true,
      specs: { memoryTypes: ['DDR5'], integratedGraphics: ['true'] },
      specsMin: { cores: 8 },
      specsMax: { tdpW: 105 },
      sort: 'performance' as const,
      page: 2,
    };
    expect(parseListingParams(toSearchParams(q))).toEqual(q);
  });
});

describe('toApiSearch', () => {
  it('adds category, page size and an explicit sort for the API', () => {
    const s = new URLSearchParams(toApiSearch(EMPTY_QUERY, 'gpu'));
    expect(s.get('category')).toBe('gpu');
    expect(s.get('pageSize')).toBe('24');
    expect(s.get('sort')).toBe('newest');
  });

  it('uses the bracket names the backend folds into nested records', () => {
    const s = toApiSearch(setSpecRange(EMPTY_QUERY, 'vramGB', 8, undefined), 'gpu');
    expect(new URLSearchParams(s).get('specsMin[vramGB]')).toBe('8');
  });

  it('lets the path category override a category filter', () => {
    const s = new URLSearchParams(toApiSearch({ ...EMPTY_QUERY, category: 'ram' }, 'gpu'));
    expect(s.getAll('category')).toEqual(['gpu']);
  });
});

describe('filter updates', () => {
  it('toggles spec values and removes empty groups', () => {
    const on = toggleSpecValue({ ...EMPTY_QUERY, page: 4 }, 'wifi', 'true');
    expect(on.specs).toEqual({ wifi: ['true'] });
    expect(on.page).toBe(1);
    expect(toggleSpecValue(on, 'wifi', 'true').specs).toEqual({});
  });

  it('toggles brands', () => {
    const q = toggleBrand(toggleBrand(EMPTY_QUERY, 'ASUS'), 'MSI');
    expect(q.brand).toEqual(['ASUS', 'MSI']);
    expect(toggleBrand(q, 'ASUS').brand).toEqual(['MSI']);
  });

  it('swaps inverted ranges and clears missing bounds', () => {
    const q = setSpecRange(EMPTY_QUERY, 'cores', 16, 6);
    expect(q.specsMin).toEqual({ cores: 6 });
    expect(q.specsMax).toEqual({ cores: 16 });
    const cleared = setSpecRange(q, 'cores', undefined, undefined);
    expect(cleared.specsMin).toEqual({});
    expect(cleared.specsMax).toEqual({});
    expect(setPriceRange(EMPTY_QUERY, 9, 3)).toMatchObject({ minPrice: 3, maxPrice: 9 });
    expect(setPriceRange(EMPTY_QUERY, undefined, 0).maxPrice).toBeUndefined();
  });

  it('counts filter groups, not values', () => {
    let q = toggleSpecValue(EMPTY_QUERY, 'socket', 'AM5');
    q = toggleSpecValue(q, 'socket', 'AM4');
    q = setSpecRange(q, 'cores', 6, 12);
    q = setPriceRange(q, 1, undefined);
    q = toggleBrand(q, 'AMD');
    q = { ...q, inStock: true, q: 'ryzen', sort: 'name' };
    expect(countActiveFilters(q)).toBe(5);
    expect(countActiveFilters(setCategory(q, 'cpu'))).toBe(6);
    const cleared = clearFilters(q);
    expect(countActiveFilters(cleared)).toBe(0);
    expect(cleared).toMatchObject({ q: 'ryzen', sort: 'name', page: 1 });
  });

  it('keeps filters when paging', () => {
    const q = setPage(toggleBrand(EMPTY_QUERY, 'MSI'), 3);
    expect(q).toMatchObject({ brand: ['MSI'], page: 3 });
  });
});

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses the middle with gaps', () => {
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 4, 'gap', 12]);
    expect(pageWindow(12, 12)).toEqual([1, 'gap', 9, 10, 11, 12]);
  });
});
