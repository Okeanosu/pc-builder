import { CATEGORY_LABELS, type FacetDTO, type SpecField } from '@pc/shared';
import { formatNumber, formatSpecValue, formatVnd } from '@/lib/format';
import type { ListingQuery } from './listing-query';

export interface BrandCount {
  name: string;
  count: number;
}

export interface FilterField {
  field: SpecField;
  /** Facet values with product counts, in the API's display order. */
  values: { value: string; count: number }[];
}

/** Filterable schema fields joined with their facet counts; fields without values are dropped. */
export function buildFilterFields(schema: readonly SpecField[], facets: readonly FacetDTO[]): FilterField[] {
  const byKey = new Map(facets.map((f) => [f.key, f]));
  return schema.flatMap((field) => {
    const facet = byKey.get(field.key);
    if (!field.filterable || !facet || facet.values.length === 0) return [];
    if (field.type === 'number[]') return [];
    return [{ field, values: facet.values }];
  });
}

export function facetValueLabel(field: SpecField, raw: string): string {
  if (field.type === 'boolean') return raw === 'true' ? 'Có' : 'Không';
  const value = field.type === 'number' ? Number(raw) : raw;
  return formatSpecValue(value, field) ?? raw;
}

export function rangeLabel(min: number | undefined, max: number | undefined, fmt: (n: number) => string) {
  if (min !== undefined && max !== undefined) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== undefined) return `từ ${fmt(min)}`;
  return `đến ${fmt(max as number)}`;
}

export interface ActiveChip {
  id: string;
  label: string;
  remove: (q: ListingQuery) => ListingQuery;
}

/** One removable chip per active filter value, for the strip above the results. */
export function activeChips(query: ListingQuery, fields: readonly FilterField[]): ActiveChip[] {
  const fieldByKey = new Map(fields.map((f) => [f.field.key, f.field]));
  const chips: ActiveChip[] = [];
  const page1 = (q: ListingQuery): ListingQuery => ({ ...q, page: 1 });

  if (query.category) {
    chips.push({
      id: 'category',
      label: CATEGORY_LABELS[query.category],
      remove: (q) => page1({ ...q, category: undefined }),
    });
  }
  if (query.inStock) {
    chips.push({ id: 'inStock', label: 'Còn hàng', remove: (q) => page1({ ...q, inStock: false }) });
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    chips.push({
      id: 'price',
      label: `Giá ${rangeLabel(query.minPrice, query.maxPrice, formatVnd)}`,
      remove: (q) => page1({ ...q, minPrice: undefined, maxPrice: undefined }),
    });
  }
  for (const brand of query.brand) {
    chips.push({
      id: `brand:${brand}`,
      label: brand,
      remove: (q) => page1({ ...q, brand: q.brand.filter((b) => b !== brand) }),
    });
  }
  for (const [key, values] of Object.entries(query.specs)) {
    const field = fieldByKey.get(key);
    for (const value of values) {
      chips.push({
        id: `specs:${key}:${value}`,
        label: field ? `${field.label}: ${facetValueLabel(field, value)}` : `${key}: ${value}`,
        remove: (q) => {
          const rest = (q.specs[key] ?? []).filter((v) => v !== value);
          const specs = { ...q.specs };
          if (rest.length > 0) specs[key] = rest;
          else delete specs[key];
          return page1({ ...q, specs });
        },
      });
    }
  }
  for (const key of new Set([...Object.keys(query.specsMin), ...Object.keys(query.specsMax)])) {
    const field = fieldByKey.get(key);
    const unit = field?.unit ? ` ${field.unit}` : '';
    chips.push({
      id: `range:${key}`,
      label: `${field?.label ?? key} ${rangeLabel(query.specsMin[key], query.specsMax[key], (n) => `${formatNumber(n)}${unit}`)}`,
      remove: (q) => {
        const specsMin = { ...q.specsMin };
        const specsMax = { ...q.specsMax };
        delete specsMin[key];
        delete specsMax[key];
        return page1({ ...q, specsMin, specsMax });
      },
    });
  }
  return chips;
}
