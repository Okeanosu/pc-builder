import { SPEC_SCHEMAS, type SpecField } from '@pc/shared';
import type { FieldErrors } from '../errors';

/** Raw form state per spec type: numbers stay text while typing so "3." or "" are representable. */
export type SpecDraftValue = string | boolean | string[] | number[];
export type SpecDraft = Record<string, SpecDraftValue>;

export const specPath = (key: string) => `specs.${key}`;

interface SchemaNode {
  def?: { type?: string };
  isInt?: boolean;
  unwrap?: () => SchemaNode;
  element?: SchemaNode;
  shape?: Record<string, SchemaNode>;
}

/** Spec keys the shared zod schemas declare as integers (number or number[]), e.g. cores, capacityGB. */
const INTEGER_SPEC_KEYS: ReadonlySet<string> = (() => {
  const keys = new Set<string>();
  for (const schema of Object.values(SPEC_SCHEMAS) as SchemaNode[]) {
    for (const [key, node] of Object.entries(schema.shape ?? {})) {
      let n: SchemaNode | undefined = node;
      if (n?.def?.type === 'optional') n = n.unwrap?.();
      if (n?.def?.type === 'array') n = n.element;
      if (n?.def?.type === 'number' && n.isInt) keys.add(key);
    }
  }
  return keys;
})();

/** Fields unknown to the shared schemas (added by an admin) are treated as decimals. */
export const isIntegerField = (field: SpecField) => INTEGER_SPEC_KEYS.has(field.key);

const PLAIN_INT = /^-?\d+$/;
/** Two or more groups ("1.000.000"), one separator kind throughout: thousands, never a decimal. */
const MULTI_GROUPED = /^-?\d{1,3}([.,])\d{3}(?:\1\d{3})+$/;
const ONE_GROUP = /^-?\d{1,3}[.,]\d{3}$/;
const DECIMAL = /^-?\d+[.,]\d+$/;

/**
 * "" is empty. Integer fields accept "1.000" / "1,000" thousand separators. Decimal fields accept "3,5" or
 * "3.5", but "1,000" could mean 1 or 1000 there, so it comes back `ambiguous` rather than a guess.
 */
export function parseNumber(
  text: string,
  { integer = false }: { integer?: boolean } = {},
): number | null | 'invalid' | 'ambiguous' {
  const t = text.trim();
  if (t === '') return null;
  if (PLAIN_INT.test(t)) return Number(t);
  if (MULTI_GROUPED.test(t)) return Number(t.replace(/[.,]/g, ''));
  if (ONE_GROUP.test(t)) return integer ? Number(t.replace(/[.,]/g, '')) : 'ambiguous';
  if (!integer && DECIMAL.test(t)) return Number(t.replace(',', '.'));
  return 'invalid';
}

/** Vietnamese hint for a value parseNumber refused; `label` prefixes field-level messages. */
function numberHint(result: 'invalid' | 'ambiguous', text: string, integer: boolean, label?: string): string {
  const prefix = label ? `${label}: ` : '';
  if (result === 'ambiguous') {
    return `${prefix}chưa rõ “${text.trim()}” là số thập phân hay hàng nghìn. Viết 1000 nếu là một nghìn, 1.5 nếu là số thập phân`;
  }
  return integer ? `${prefix}nhập số nguyên, ví dụ 8 hoặc 1.000` : `${prefix}nhập một số, ví dụ 3.5`;
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
        const integer = isIntegerField(f);
        const n = parseNumber(String(raw), { integer });
        if (n === 'invalid' || n === 'ambiguous') {
          delete specs[f.key];
          errors[specPath(f.key)] = numberHint(n, String(raw), integer, f.label);
        } else if (n === null) missing(f, `${f.label}: bắt buộc nhập`);
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
export function addNumberChip(
  list: number[],
  text: string,
  integer = false,
): { list: number[]; error: string | null } {
  const n = parseNumber(text, { integer });
  if (n === null) return { list, error: null };
  if (n === 'invalid' || n === 'ambiguous') {
    const hint = numberHint(n, text, integer);
    return { list, error: hint.charAt(0).toUpperCase() + hint.slice(1) };
  }
  if (list.includes(n)) return { list, error: null };
  return { list: [...list, n].sort((a, b) => a - b), error: null };
}
