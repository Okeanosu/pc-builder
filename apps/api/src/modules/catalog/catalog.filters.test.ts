import type { SpecField } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/errors';
import {
  catalogQuerySchema,
  nestBracketParams,
  rangeFilters,
  sortFacetValues,
  specContainment,
} from './catalog.filters';

const field = (key: string, type: SpecField['type'], options?: string[]): SpecField => ({
  key,
  label: key,
  type,
  options,
  required: true,
  filterable: true,
});

const CPU_FIELDS = new Map<string, SpecField>([
  ['socket', field('socket', 'enum', ['AM4', 'AM5', 'LGA1700'])],
  ['cores', field('cores', 'number')],
  ['integratedGraphics', field('integratedGraphics', 'boolean')],
  ['memoryTypes', field('memoryTypes', 'enum[]', ['DDR4', 'DDR5'])],
  ['radiatorSupportMm', field('radiatorSupportMm', 'number[]')],
  ['chipset', field('chipset', 'string')],
]);

describe('nestBracketParams', () => {
  it('folds flat bracket keys from the simple query parser into records', () => {
    expect(
      nestBracketParams({
        category: 'cpu',
        'specs[socket]': 'AM5',
        'specs[memoryTypes]': ['DDR4', 'DDR5'],
        'specsMin[cores]': '8',
        'specs[chipset][]': 'B650',
      }),
    ).toEqual({
      category: 'cpu',
      specs: { socket: 'AM5', memoryTypes: ['DDR4', 'DDR5'], chipset: ['B650'] },
      specsMin: { cores: '8' },
    });
  });

  it('keeps records produced by an extended parser', () => {
    expect(nestBracketParams({ specs: { socket: 'AM5' } })).toEqual({ specs: { socket: 'AM5' } });
  });

  it('lets bracket keys win over a bare scalar of the same group, in either order', () => {
    const expected = { specs: { socket: 'AM5' } };
    expect(nestBracketParams({ specs: 'foo', 'specs[socket]': 'AM5' })).toEqual(expected);
    expect(nestBracketParams({ 'specs[socket]': 'AM5', specs: 'foo' })).toEqual(expected);
    expect(nestBracketParams({ specs: ['a', 'b'], 'specs[socket]': 'AM5' })).toEqual(expected);
    expect(nestBracketParams({ specs: 'foo' })).toEqual({ specs: 'foo' });
  });

  it('drops prototype-polluting keys', () => {
    const out = nestBracketParams({
      'specs[__proto__]': ['a', 'b'],
      __proto__x: '1',
      'specs[socket]': 'AM5',
    });
    expect(Object.getPrototypeOf(out.specs)).toBe(Object.prototype);
    expect(out).toEqual({ specs: { socket: 'AM5' } });
  });
});

describe('catalogQuerySchema', () => {
  it('parses inStock=false as false (z.coerce.boolean would say true)', () => {
    expect(catalogQuerySchema.parse({ inStock: 'false' }).inStock).toBe(false);
    expect(catalogQuerySchema.parse({ inStock: 'true' }).inStock).toBe(true);
    expect(catalogQuerySchema.parse({}).inStock).toBeUndefined();
  });

  it('coerces numeric ranges and applies paging defaults', () => {
    const q = catalogQuerySchema.parse({ specsMin: { cores: '8' }, specsMax: { cores: '16' } });
    expect(q.specsMin).toEqual({ cores: 8 });
    expect(q.specsMax).toEqual({ cores: 16 });
    expect(q).toMatchObject({ page: 1, pageSize: 24, sort: 'newest' });
  });
});

describe('specContainment', () => {
  it('merges single values into one containment object, typed by the spec schema', () => {
    const r = specContainment(
      {
        socket: 'AM5',
        cores: '8',
        integratedGraphics: 'true',
        memoryTypes: 'DDR5',
        radiatorSupportMm: '360',
      },
      CPU_FIELDS,
    );
    expect(r.all).toEqual({
      socket: 'AM5',
      cores: 8,
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
      radiatorSupportMm: [360],
    });
    expect(r.anyOf).toEqual([]);
  });

  it('ORs comma-separated or repeated values of one key', () => {
    const r = specContainment({ socket: 'AM5,AM4', memoryTypes: ['DDR4', 'DDR5'] }, CPU_FIELDS);
    expect(r.all).toBeNull();
    expect(r.anyOf).toEqual([
      [{ socket: 'AM5' }, { socket: 'AM4' }],
      [{ memoryTypes: ['DDR4'] }, { memoryTypes: ['DDR5'] }],
    ]);
  });

  it('treats unknown keys as strings and ignores blank values', () => {
    const r = specContainment({ color: 'white', socket: ' , ' }, CPU_FIELDS);
    expect(r.all).toEqual({ color: 'white' });
  });

  it('rejects values that do not match the field type with 422', () => {
    expect(() => specContainment({ cores: 'eight' }, CPU_FIELDS)).toThrow(AppError);
    expect(() => specContainment({ integratedGraphics: 'yes' }, CPU_FIELDS)).toThrow(/không hợp lệ/);
    try {
      specContainment({ cores: 'eight' }, CPU_FIELDS);
    } catch (err) {
      expect((err as AppError).status).toBe(422);
      expect((err as AppError).details).toEqual([{ path: 'specs.cores', message: expect.any(String) }]);
    }
  });

  it('rejects keys that are not plain identifiers', () => {
    expect(() => specContainment({ 'socket"; drop': 'AM5' }, CPU_FIELDS)).toThrow(AppError);
  });
});

describe('rangeFilters', () => {
  it('turns min/max records into numeric bounds', () => {
    expect(rangeFilters({ cores: 8 }, { cores: 16 }, CPU_FIELDS)).toEqual([
      { key: 'cores', op: 'gte', value: 8 },
      { key: 'cores', op: 'lte', value: 16 },
    ]);
  });

  it('only allows numeric fields', () => {
    expect(() => rangeFilters({ socket: 1 }, undefined, CPU_FIELDS)).toThrow(AppError);
  });
});

describe('sortFacetValues', () => {
  it('orders numbers numerically, enums by option order and booleans true-first', () => {
    const counts = (values: string[]) => values.map((value) => ({ value, count: 1 }));
    expect(sortFacetValues(field('c', 'number'), counts(['16', '8', '12'])).map((v) => v.value)).toEqual([
      '8',
      '12',
      '16',
    ]);
    expect(
      sortFacetValues(CPU_FIELDS.get('socket')!, counts(['LGA1700', 'AM5', 'AM4'])).map((v) => v.value),
    ).toEqual(['AM4', 'AM5', 'LGA1700']);
    expect(sortFacetValues(field('b', 'boolean'), counts(['false', 'true'])).map((v) => v.value)).toEqual([
      'true',
      'false',
    ]);
    expect(
      sortFacetValues(field('s', 'string'), counts(['Z790', 'B650', 'A620'])).map((v) => v.value),
    ).toEqual(['A620', 'B650', 'Z790']);
  });
});
