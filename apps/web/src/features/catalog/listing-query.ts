import type { CategoryKey, ProductQuery } from '@pc/shared';

export type SortKey = ProductQuery['sort'];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'performance', label: 'Hiệu năng cao' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name', label: 'Tên A → Z' },
];

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
export const DEFAULT_SORT: SortKey = 'newest';
export const PAGE_SIZE = 24;

/** Filter state of a product listing. Field names mirror the backend query parameters. */
export interface ListingQuery {
  q?: string;
  brand: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  specs: Record<string, string[]>;
  specsMin: Record<string, number>;
  specsMax: Record<string, number>;
  sort: SortKey;
  page: number;
}

export const EMPTY_QUERY: ListingQuery = {
  brand: [],
  inStock: false,
  specs: {},
  specsMin: {},
  specsMax: {},
  sort: DEFAULT_SORT,
  page: 1,
};

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function entriesOf(raw: RawParams): [string, string][] {
  if (raw instanceof URLSearchParams) return [...raw.entries()];
  return Object.entries(raw).flatMap(([k, v]) =>
    v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string]),
  );
}

const SPEC_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const GROUPED = /^(specs|specsMin|specsMax)\[([^\]]+)\]$/;

const splitList = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function toNonNegative(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function toFinite(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const uniq = (xs: string[]) => [...new Set(xs)];

/** Reads listing filters from URL search params, dropping anything malformed instead of failing the page. */
export function parseListingParams(raw: RawParams): ListingQuery {
  const out: ListingQuery = { ...EMPTY_QUERY, brand: [], specs: {}, specsMin: {}, specsMax: {} };
  for (const [key, value] of entriesOf(raw)) {
    const grouped = GROUPED.exec(key);
    if (grouped) {
      const [, group, specKey] = grouped as unknown as [string, string, string];
      if (!SPEC_KEY.test(specKey)) continue;
      if (group === 'specs') {
        const values = uniq([...(out.specs[specKey] ?? []), ...splitList(value)]);
        if (values.length > 0) out.specs[specKey] = values;
      } else {
        const n = toFinite(value);
        if (n !== undefined) (group === 'specsMin' ? out.specsMin : out.specsMax)[specKey] = n;
      }
      continue;
    }
    switch (key) {
      case 'q': {
        const q = value.trim().slice(0, 100);
        if (q) out.q = q;
        break;
      }
      case 'brand':
        out.brand = uniq([...out.brand, ...splitList(value)]);
        break;
      case 'minPrice':
        out.minPrice = toNonNegative(value);
        break;
      case 'maxPrice': {
        const n = toNonNegative(value);
        out.maxPrice = n && n > 0 ? n : undefined;
        break;
      }
      case 'inStock':
        out.inStock = value === 'true' || value === '1';
        break;
      case 'sort':
        if (SORT_KEYS.has(value)) out.sort = value as SortKey;
        break;
      case 'page': {
        const n = Number(value);
        if (Number.isInteger(n) && n >= 1) out.page = n;
        break;
      }
    }
  }
  return out;
}

const sortedKeys = (o: object) => Object.keys(o).sort();

/** Serialises filters for the page URL (defaults omitted, stable order so equal filters give equal strings). */
export function toSearchParams(query: ListingQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.brand.length > 0) p.set('brand', [...query.brand].sort().join(','));
  if (query.minPrice !== undefined) p.set('minPrice', String(query.minPrice));
  if (query.maxPrice !== undefined) p.set('maxPrice', String(query.maxPrice));
  if (query.inStock) p.set('inStock', 'true');
  for (const k of sortedKeys(query.specs)) {
    const values = query.specs[k] ?? [];
    if (values.length > 0) p.set(`specs[${k}]`, [...values].sort().join(','));
  }
  for (const k of sortedKeys(query.specsMin)) p.set(`specsMin[${k}]`, String(query.specsMin[k]));
  for (const k of sortedKeys(query.specsMax)) p.set(`specsMax[${k}]`, String(query.specsMax[k]));
  if (query.sort !== DEFAULT_SORT) p.set('sort', query.sort);
  if (query.page > 1) p.set('page', String(query.page));
  return p;
}

/** Query string for GET /products: the URL filters plus category and page size. */
export function toApiSearch(query: ListingQuery, category?: CategoryKey, pageSize = PAGE_SIZE): string {
  const p = toSearchParams(query);
  if (category) p.set('category', category);
  p.set('pageSize', String(pageSize));
  if (!p.has('sort')) p.set('sort', query.sort);
  return p.toString();
}

/** `?a=b` or '' — for building hrefs. */
export function queryString(query: ListingQuery): string {
  const s = toSearchParams(query).toString();
  return s ? `?${s}` : '';
}

/** Number of active filter groups (sort, page and the search text are not filters). */
export function countActiveFilters(query: ListingQuery): number {
  let n = 0;
  if (query.brand.length > 0) n++;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) n++;
  if (query.inStock) n++;
  n += Object.values(query.specs).filter((v) => v.length > 0).length;
  n += new Set([...Object.keys(query.specsMin), ...Object.keys(query.specsMax)]).size;
  return n;
}

/** Every filter change sends the shopper back to page 1. */
const reset = (q: ListingQuery, patch: Partial<ListingQuery>): ListingQuery => ({ ...q, ...patch, page: 1 });

export function toggleSpecValue(query: ListingQuery, key: string, value: string): ListingQuery {
  const current = query.specs[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const specs = { ...query.specs };
  if (next.length > 0) specs[key] = next;
  else delete specs[key];
  return reset(query, { specs });
}

export function toggleBrand(query: ListingQuery, brand: string): ListingQuery {
  const brandList = query.brand.includes(brand)
    ? query.brand.filter((b) => b !== brand)
    : [...query.brand, brand];
  return reset(query, { brand: brandList });
}

export function setSpecRange(
  query: ListingQuery,
  key: string,
  min: number | undefined,
  max: number | undefined,
): ListingQuery {
  const specsMin = { ...query.specsMin };
  const specsMax = { ...query.specsMax };
  const [lo, hi] = min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
  if (lo === undefined) delete specsMin[key];
  else specsMin[key] = lo;
  if (hi === undefined) delete specsMax[key];
  else specsMax[key] = hi;
  return reset(query, { specsMin, specsMax });
}

export function setPriceRange(
  query: ListingQuery,
  min: number | undefined,
  max: number | undefined,
): ListingQuery {
  const [lo, hi] = min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
  return reset(query, { minPrice: lo, maxPrice: hi && hi > 0 ? hi : undefined });
}

export function setInStock(query: ListingQuery, inStock: boolean): ListingQuery {
  return reset(query, { inStock });
}

export function setSort(query: ListingQuery, sort: SortKey): ListingQuery {
  return reset(query, { sort });
}

export function setPage(query: ListingQuery, page: number): ListingQuery {
  return { ...query, page: Math.max(1, Math.floor(page)) };
}

/** Keeps the search text and sort, drops every filter. */
export function clearFilters(query: ListingQuery): ListingQuery {
  return { ...EMPTY_QUERY, q: query.q, sort: query.sort, brand: [], specs: {}, specsMin: {}, specsMax: {} };
}

/** Page numbers with gaps for a compact pager, e.g. [1, 'gap', 4, 5, 6, 'gap', 12]. */
export function pageWindow(current: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  if (current <= 3) for (const p of [2, 3, 4]) pages.add(p);
  if (current >= totalPages - 2)
    for (const p of [totalPages - 3, totalPages - 2, totalPages - 1]) pages.add(p);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push('gap');
    out.push(p);
  });
  return out;
}
