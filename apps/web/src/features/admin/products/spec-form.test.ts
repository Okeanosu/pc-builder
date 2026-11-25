import type { SpecField } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { addNumberChip, draftToSpecs, isIntegerField, parseNumber, specsToDraft } from './spec-form';

const fields: SpecField[] = [
  {
    key: 'socket',
    label: 'Socket',
    type: 'enum',
    options: ['AM5', 'LGA1700'],
    required: true,
    filterable: true,
  },
  { key: 'cores', label: 'Số nhân', type: 'number', required: true, filterable: true },
  {
    key: 'boostClockGHz',
    label: 'Xung boost',
    type: 'number',
    unit: 'GHz',
    required: false,
    filterable: false,
  },
  { key: 'chipset', label: 'Chipset', type: 'string', required: false, filterable: false },
  { key: 'integratedGraphics', label: 'iGPU', type: 'boolean', required: true, filterable: true },
  {
    key: 'memoryTypes',
    label: 'Loại RAM',
    type: 'enum[]',
    options: ['DDR4', 'DDR5'],
    required: true,
    filterable: true,
  },
  {
    key: 'radiatorSupportMm',
    label: 'Radiator',
    type: 'number[]',
    unit: 'mm',
    required: false,
    filterable: false,
  },
];

describe('parseNumber', () => {
  it('accepts dot and comma decimals, empty as null, rejects text', () => {
    expect(parseNumber('3.5')).toBe(3.5);
    expect(parseNumber(' 3,5 ')).toBe(3.5);
    expect(parseNumber('12')).toBe(12);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBe('invalid');
    expect(parseNumber('3.')).toBe('invalid');
    expect(parseNumber('1234.567')).toBe(1234.567);
  });

  it('refuses to guess whether "1,000" is one or one thousand in a decimal field', () => {
    expect(parseNumber('1,000')).toBe('ambiguous');
    expect(parseNumber('1.000')).toBe('ambiguous');
    expect(parseNumber('-2,500')).toBe('ambiguous');
    expect(parseNumber('1.000.000')).toBe(1_000_000);
    expect(parseNumber('1,000,000')).toBe(1_000_000);
  });

  it('reads dot or comma thousand separators in an integer field', () => {
    const int = { integer: true };
    expect(parseNumber('1.000', int)).toBe(1000);
    expect(parseNumber('1,000', int)).toBe(1000);
    expect(parseNumber(' 12.500.000 ', int)).toBe(12_500_000);
    expect(parseNumber('750', int)).toBe(750);
    expect(parseNumber('', int)).toBeNull();
  });

  it('rejects decimals and mixed or misplaced separators in an integer field', () => {
    const int = { integer: true };
    expect(parseNumber('6.5', int)).toBe('invalid');
    expect(parseNumber('1,00', int)).toBe('invalid');
    expect(parseNumber('1.000,5', int)).toBe('invalid');
    expect(parseNumber('1.000,000', int)).toBe('invalid');
    expect(parseNumber('10,0000', int)).toBe('invalid');
  });
});

describe('isIntegerField', () => {
  const number = (key: string): SpecField => ({
    key,
    label: key,
    type: 'number',
    required: false,
    filterable: false,
  });
  it('follows the integer rules of the shared spec schemas', () => {
    expect(isIntegerField(number('cores'))).toBe(true);
    expect(isIntegerField(number('capacityGB'))).toBe(true);
    expect(isIntegerField({ ...number('radiatorSupportMm'), type: 'number[]' })).toBe(true);
    expect(isIntegerField(number('boostClockGHz'))).toBe(false);
  });

  it('treats fields the shared schemas do not know as decimals', () => {
    expect(isIntegerField(number('fanCount'))).toBe(false);
  });
});

describe('specsToDraft', () => {
  it('turns stored JSONB values into editable form state per type', () => {
    const draft = specsToDraft(fields, {
      socket: 'AM5',
      cores: 6,
      boostClockGHz: 5.3,
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
      radiatorSupportMm: [240, 360],
    });
    expect(draft).toEqual({
      socket: 'AM5',
      cores: '6',
      boostClockGHz: '5.3',
      chipset: '',
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
      radiatorSupportMm: [240, 360],
    });
  });

  it('gives empty values for a new product', () => {
    const draft = specsToDraft(fields, {});
    expect(draft.cores).toBe('');
    expect(draft.integratedGraphics).toBe(false);
    expect(draft.memoryTypes).toEqual([]);
  });
});

describe('draftToSpecs', () => {
  it('parses numbers and drops empty optional values', () => {
    const { specs, errors } = draftToSpecs(fields, {
      socket: 'AM5',
      cores: '8',
      boostClockGHz: '',
      chipset: '  ',
      integratedGraphics: false,
      memoryTypes: ['DDR5'],
      radiatorSupportMm: [],
    });
    expect(errors).toEqual({});
    expect(specs).toEqual({ socket: 'AM5', cores: 8, integratedGraphics: false, memoryTypes: ['DDR5'] });
  });

  it('reports parse errors and missing required values on the spec path', () => {
    const { errors } = draftToSpecs(fields, {
      socket: '',
      cores: 'tám',
      integratedGraphics: false,
      memoryTypes: [],
    });
    expect(Object.keys(errors).sort()).toEqual(['specs.cores', 'specs.memoryTypes', 'specs.socket']);
    expect(errors['specs.cores']).toContain('nhập số nguyên');
  });

  it('stores "1.000" in an integer field as one thousand, not 1', () => {
    const { specs, errors } = draftToSpecs(fields, {
      socket: 'AM5',
      cores: '1.000',
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    });
    expect(errors).toEqual({});
    expect(specs.cores).toBe(1000);
  });

  it('asks for a whole number in an integer field instead of waiting for the server', () => {
    const { errors } = draftToSpecs(fields, {
      socket: 'AM5',
      cores: '6,5',
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    });
    expect(errors['specs.cores']).toMatch(/số nguyên/);
  });

  it('explains the ambiguity of "5,000" in a decimal field instead of storing 5', () => {
    const { specs, errors } = draftToSpecs(fields, {
      socket: 'AM5',
      cores: '8',
      boostClockGHz: '5,000',
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    });
    expect(specs).not.toHaveProperty('boostClockGHz');
    expect(errors['specs.boostClockGHz']).toMatch(/5,000/);
    expect(errors['specs.boostClockGHz']).toMatch(/thập phân/);
  });

  it('leaves ranges to the server', () => {
    const { specs, errors } = draftToSpecs(fields, {
      socket: 'AM5',
      cores: '-4',
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    });
    expect(errors).toEqual({});
    expect(specs.cores).toBe(-4);
  });

  it('keeps stored keys the current schema does not show', () => {
    const { specs } = draftToSpecs(
      fields,
      { socket: 'AM5', cores: '6', integratedGraphics: true, memoryTypes: ['DDR5'], boostClockGHz: '' },
      { threads: 12, boostClockGHz: 5.1 },
    );
    expect(specs.threads).toBe(12);
    expect(specs).not.toHaveProperty('boostClockGHz');
  });
});

describe('addNumberChip', () => {
  it('adds unique numbers in order and flags text', () => {
    expect(addNumberChip([240], '120').list).toEqual([120, 240]);
    expect(addNumberChip([240], '240').list).toEqual([240]);
    expect(addNumberChip([240], 'x').error).toBeTruthy();
    expect(addNumberChip([240], '').list).toEqual([240]);
  });

  it('reads thousand separators and rejects decimals for an integer list', () => {
    expect(addNumberChip([], '1.000', true).list).toEqual([1000]);
    expect(addNumberChip([240], '3,5', true).error).toMatch(/số nguyên/);
  });
});
