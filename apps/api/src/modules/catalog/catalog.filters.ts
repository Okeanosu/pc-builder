import { type ProductQuery, productQuerySchema, type SpecField } from '@pc/shared';
import { z } from 'zod';
import { AppError } from '../../lib/errors';

const SPEC_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const NESTED_PARAMS = new Set(['specs', 'specsMin', 'specsMax']);
const UNSAFE_KEY = /__proto__|constructor|prototype/;

const queryBoolean = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

const numericRecord = z.record(z.string(), z.coerce.number().finite());

/** productQuerySchema plus numeric spec ranges; inStock parsed strictly so "false" means false. */
export const catalogQuerySchema = productQuerySchema.extend({
  inStock: queryBoolean.optional(),
  specsMin: numericRecord.optional(),
  specsMax: numericRecord.optional(),
});

export type CatalogQuery = Omit<ProductQuery, 'sort' | 'page' | 'pageSize'> &
  Partial<Pick<ProductQuery, 'sort' | 'page' | 'pageSize'>> & {
    specsMin?: Record<string, number>;
    specsMax?: Record<string, number>;
  };

/**
 * Express 5 defaults to the "simple" query parser, which leaves `specs[socket]=AM5` as a flat key.
 * Fold those keys into nested records so the same schema works with either parser.
 */
export function nestBracketParams(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(query)) {
    if (UNSAFE_KEY.test(rawKey)) continue;
    const m = /^(\w+)\[([^\]]+)\](\[\])?$/.exec(rawKey);
    if (!m || !NESTED_PARAMS.has(m[1]!)) {
      out[rawKey] = value;
      continue;
    }
    const [, group, key, arraySuffix] = m as unknown as [string, string, string, string | undefined];
    const target = (out[group] ?? {}) as Record<string, unknown>;
    target[key] = arraySuffix && !Array.isArray(value) ? [value] : value;
    out[group] = target;
  }
  return out;
}

const invalid = (path: string, message: string) =>
  new AppError(422, 'VALIDATION_ERROR', `Bộ lọc không hợp lệ: ${message}`, [{ path, message }]);

function assertKey(group: string, key: string) {
  if (!SPEC_KEY.test(key)) throw invalid(`${group}.${key}`, `thuộc tính "${key}" không hợp lệ`);
}

function toNumber(raw: string, path: string): number {
  const n = Number(raw);
  if (raw === '' || !Number.isFinite(n)) throw invalid(path, `"${raw}" không phải là số`);
  return n;
}

function toBoolean(raw: string, path: string): boolean {
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw invalid(path, `"${raw}" không phải true/false`);
}

/** JSON value that `specs @> {key: value}` must contain for one requested value. */
function containedValue(field: SpecField | undefined, raw: string, path: string): unknown {
  switch (field?.type) {
    case 'number':
      return toNumber(raw, path);
    case 'boolean':
      return toBoolean(raw, path);
    case 'enum[]':
      return [raw];
    case 'number[]':
      return [toNumber(raw, path)];
    default:
      return raw;
  }
}

const splitValues = (v: string | string[]) =>
  (Array.isArray(v) ? v : [v])
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export interface SpecContainment {
  /** One object for all single-valued keys, matched with a single `@>`. */
  all: Record<string, unknown> | null;
  /** Keys with several values: each inner list is OR'd, the groups are AND'ed. */
  anyOf: Record<string, unknown>[][];
}

export function specContainment(
  specs: Record<string, string | string[]>,
  fields: ReadonlyMap<string, SpecField>,
): SpecContainment {
  const all: Record<string, unknown> = {};
  const anyOf: Record<string, unknown>[][] = [];
  for (const [key, raw] of Object.entries(specs)) {
    assertKey('specs', key);
    const values = splitValues(raw);
    if (values.length === 0) continue;
    const typed = values.map((v) => containedValue(fields.get(key), v, `specs.${key}`));
    if (typed.length === 1) all[key] = typed[0];
    else anyOf.push(typed.map((v) => ({ [key]: v })));
  }
  return { all: Object.keys(all).length > 0 ? all : null, anyOf };
}

export interface RangeFilter {
  key: string;
  op: 'gte' | 'lte';
  value: number;
}

export function rangeFilters(
  min: Record<string, number> | undefined,
  max: Record<string, number> | undefined,
  fields: ReadonlyMap<string, SpecField>,
): RangeFilter[] {
  const out: RangeFilter[] = [];
  const add = (group: string, record: Record<string, number> | undefined, op: RangeFilter['op']) => {
    for (const [key, value] of Object.entries(record ?? {})) {
      assertKey(group, key);
      const type = fields.get(key)?.type;
      if (type && type !== 'number') throw invalid(`${group}.${key}`, `"${key}" không phải thuộc tính số`);
      out.push({ key, op, value });
    }
  };
  add('specsMin', min, 'gte');
  add('specsMax', max, 'lte');
  return out;
}

export function sortFacetValues<T extends { value: string }>(field: SpecField, values: T[]): T[] {
  const sorted = [...values];
  if (field.type === 'number' || field.type === 'number[]') {
    return sorted.sort((a, b) => Number(a.value) - Number(b.value));
  }
  if (field.type === 'boolean') {
    return sorted.sort((a, b) => Number(b.value === 'true') - Number(a.value === 'true'));
  }
  const order = new Map((field.options ?? []).map((o, i) => [o, i]));
  return sorted.sort((a, b) => {
    const ia = order.get(a.value) ?? Number.MAX_SAFE_INTEGER;
    const ib = order.get(b.value) ?? Number.MAX_SAFE_INTEGER;
    return ia !== ib ? ia - ib : a.value.localeCompare(b.value, 'en', { numeric: true });
  });
}
