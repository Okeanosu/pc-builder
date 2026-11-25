import type { CategoryKey, ProductQuery } from '@pc/shared';

export const PICKER_PAGE_SIZE = 12;

export interface PickerFilters {
  category: CategoryKey;
  q: string;
  sort: ProductQuery['sort'];
  /** facet key → selected values (OR within a key, AND across keys). */
  specs: Record<string, string[]>;
}

/** Query string for GET /products; empty facets are dropped and values joined with commas. */
export function pickerSearchParams(filters: PickerFilters, page: number): URLSearchParams {
  const params = new URLSearchParams({
    category: filters.category,
    sort: filters.sort,
    page: String(page),
    pageSize: String(PICKER_PAGE_SIZE),
    inStock: 'true',
  });
  const q = filters.q.trim();
  if (q) params.set('q', q);
  for (const [key, values] of Object.entries(filters.specs)) {
    if (values.length > 0) params.set(`specs[${key}]`, values.join(','));
  }
  return params;
}

export function toggleFacetValue(
  specs: Record<string, string[]>,
  key: string,
  value: string,
): Record<string, string[]> {
  const current = specs[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const out = { ...specs };
  if (next.length > 0) out[key] = next;
  else delete out[key];
  return out;
}
