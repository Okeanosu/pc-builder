import type { SpecField } from '@pc/shared';
import type { FieldErrors } from '../errors';

/** Raw form state per spec type: numbers stay text while typing so "3." or "" are representable. */
export type SpecDraftValue = string | boolean | string[] | number[];
export type SpecDraft = Record<string, SpecDraftValue>;

export const specPath = (key: string) => `specs.${key}`;

/** "3,5" and "3.5" both parse; "" is empty; anything else is invalid. */
export function parseNumber(text: string): number | null | 'invalid' {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return 'invalid';
  return Number(t);
}

export function emptyDraftValue(field: SpecField): SpecDraftValue {
  switch (field.type) {
    case 'boolean':
      return false;
    case 'enum[]':
      return [] as string[];
    case 'number[]':
      return [] as number[];
    default:
      return '';
  }
}

export function specsToDraft(
  fields: SpecField[],
  specs: Record<string, unknown> | null | undefined,
): SpecDraft {
  const draft: SpecDraft = {};
  for (const f of fields) {
    const v = specs?.[f.key];
    switch (f.type) {
      case 'number':
        draft[f.key] = typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '';
        break;
      case 'string':
      case 'enum':
        draft[f.key] = typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v);
        break;
      case 'boolean':
        draft[f.key] = v === true;
        break;
      case 'enum[]':
        draft[f.key] = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
        break;
      case 'number[]':
        draft[f.key] = Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
        break;
    }
  }
  return draft;
}

/**
 * Converts the draft back to JSON specs. Only parse errors and missing required values are caught here;
 * semantic rules (integers, ranges, allowed options) are the server's call and come back as a 422.
 * Keys outside `fields` are kept from `base` so a narrowed schema never silently drops stored data.
 */
export function draftToSpecs(
  fields: SpecField[],
  draft: SpecDraft,
  base: Record<string, unknown> = {},
): { specs: Record<string, unknown>; errors: FieldErrors } {
  const specs: Record<string, unknown> = { ...base };
  const errors: FieldErrors = {};
  const missing = (f: SpecField, message: string) => {
    delete specs[f.key];
    if (f.required) errors[specPath(f.key)] = message;
  };

  for (const f of fields) {
    const raw = draft[f.key] ?? emptyDraftValue(f);
    switch (f.type) {
      case 'number': {
        const n = parseNumber(String(raw));
        if (n === 'invalid') errors[specPath(f.key)] = `${f.label}: nhập một số, ví dụ 3.5`;
        else if (n === null) missing(f, `${f.label}: bắt buộc nhập`);
        else specs[f.key] = n;
        break;
      }
      case 'string':
      case 'enum': {
        const s = String(raw).trim();
        if (s === '') missing(f, `${f.label}: bắt buộc ${f.type === 'enum' ? 'chọn' : 'nhập'}`);
        else specs[f.key] = s;
        break;
      }
      case 'boolean':
        specs[f.key] = raw === true;
        break;
      case 'enum[]':
      case 'number[]': {
        const list = Array.isArray(raw) ? raw : [];
        if (list.length === 0) missing(f, `${f.label}: cần ít nhất một giá trị`);
        else specs[f.key] = [...list];
        break;
      }
    }
  }
  return { specs, errors };
}

/** Adds a chip value to a number[] field, keeping it sorted and unique. */
export function addNumberChip(list: number[], text: string): { list: number[]; error: string | null } {
  const n = parseNumber(text);
  if (n === null) return { list, error: null };
  if (n === 'invalid') return { list, error: 'Nhập một số, ví dụ 240' };
  if (list.includes(n)) return { list, error: null };
  return { list: [...list, n].sort((a, b) => a - b), error: null };
}
