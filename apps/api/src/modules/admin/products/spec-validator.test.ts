import { cpuSpecsSchema, type SpecField } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { validateSpecs } from './spec-validator';

const CPU_FIELDS: SpecField[] = [
  { key: 'socket', label: 'Socket', type: 'enum', options: ['AM4', 'AM5'], required: true, filterable: true },
  { key: 'cores', label: 'Số nhân', type: 'number', required: true, filterable: true },
  { key: 'threads', label: 'Số luồng', type: 'number', required: true, filterable: false },
  { key: 'baseClockGHz', label: 'Base', type: 'number', required: true, filterable: false },
  { key: 'boostClockGHz', label: 'Boost', type: 'number', required: true, filterable: false },
  { key: 'tdpW', label: 'TDP', type: 'number', required: true, filterable: false },
  { key: 'integratedGraphics', label: 'iGPU', type: 'boolean', required: true, filterable: true },
  {
    key: 'memoryTypes',
    label: 'RAM',
    type: 'enum[]',
    options: ['DDR4', 'DDR5'],
    required: true,
    filterable: true,
  },
  {
    key: 'warrantyMonths',
    label: 'Bảo hành',
    type: 'number',
    unit: 'tháng',
    required: false,
    filterable: false,
  },
];

const VALID = {
  socket: 'AM5',
  cores: 6,
  threads: 12,
  baseClockGHz: 3.8,
  boostClockGHz: 5.1,
  tdpW: 65,
  integratedGraphics: true,
  memoryTypes: ['DDR5'],
};

const paths = (r: ReturnType<typeof validateSpecs>) => r.issues.map((i) => i.path);

describe('validateSpecs', () => {
  it('accepts specs satisfying both the category spec_schema and the typed schema', () => {
    const r = validateSpecs({ ...VALID, warrantyMonths: 36 }, CPU_FIELDS, cpuSpecsSchema);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ ...VALID, warrantyMonths: 36 });
  });

  it('drops keys that neither schema knows about', () => {
    const r = validateSpecs({ ...VALID, junk: 'x' }, CPU_FIELDS, cpuSpecsSchema);
    expect(r.ok).toBe(true);
    expect(r.value).not.toHaveProperty('junk');
  });

  it('reports a missing required field with its path', () => {
    const { socket: _omit, ...rest } = VALID;
    const r = validateSpecs(rest, CPU_FIELDS, cpuSpecsSchema);
    expect(r.ok).toBe(false);
    expect(paths(r)).toContain('specs.socket');
    expect(r.issues.find((i) => i.path === 'specs.socket')!.message).toMatch(/bắt buộc/i);
  });

  it('checks types and enum options declared in spec_schema', () => {
    const r = validateSpecs(
      { ...VALID, cores: 'six', socket: 'LGA9999', integratedGraphics: 'yes', memoryTypes: ['DDR3'] },
      CPU_FIELDS,
      cpuSpecsSchema,
    );
    expect(paths(r)).toEqual(
      expect.arrayContaining([
        'specs.cores',
        'specs.socket',
        'specs.integratedGraphics',
        'specs.memoryTypes',
      ]),
    );
  });

  it('enforces constraints only the typed schema knows (e.g. positive integers)', () => {
    const r = validateSpecs({ ...VALID, cores: -2 }, CPU_FIELDS, cpuSpecsSchema);
    expect(r.ok).toBe(false);
    expect(paths(r)).toContain('specs.cores');
  });

  it('enforces fields that an admin added to spec_schema', () => {
    const fields = CPU_FIELDS.map((f) => (f.key === 'warrantyMonths' ? { ...f, required: true } : f));
    expect(paths(validateSpecs(VALID, fields, cpuSpecsSchema))).toEqual(['specs.warrantyMonths']);
  });

  it('reports each path once', () => {
    const { cores: _omit, ...rest } = VALID;
    const r = validateSpecs(rest, CPU_FIELDS, cpuSpecsSchema);
    expect(paths(r).filter((p) => p === 'specs.cores')).toHaveLength(1);
  });

  it('works with spec_schema only (no typed schema)', () => {
    expect(validateSpecs({ socket: 'AM5' }, CPU_FIELDS.slice(0, 1)).ok).toBe(true);
    expect(validateSpecs({}, CPU_FIELDS.slice(0, 1)).ok).toBe(false);
  });
});
