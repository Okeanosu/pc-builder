import type { SpecField } from '@pc/shared';
import type { z } from 'zod';

export interface SpecIssue {
  path: string;
  message: string;
}

export interface SpecValidation {
  ok: boolean;
  issues: SpecIssue[];
  /** Specs restricted to keys known by spec_schema or the typed schema. */
  value: Record<string, unknown>;
}

const isMissing = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optionsText = (f: SpecField) => (f.options?.length ? ` (cho phép: ${f.options.join(', ')})` : '');

function checkField(field: SpecField, value: unknown): string | null {
  if (isMissing(value) || (Array.isArray(value) && value.length === 0)) {
    return field.required ? `${field.label}: bắt buộc nhập` : null;
  }
  const inOptions = (v: unknown) =>
    typeof v === 'string' && (!field.options?.length || field.options.includes(v));
  switch (field.type) {
    case 'number':
      return isNum(value) ? null : `${field.label}: phải là số`;
    case 'string':
      return typeof value === 'string' ? null : `${field.label}: phải là chuỗi`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${field.label}: phải là đúng/sai`;
    case 'enum':
      return inOptions(value) ? null : `${field.label}: giá trị không hợp lệ${optionsText(field)}`;
    case 'enum[]':
      return Array.isArray(value) && value.every(inOptions)
        ? null
        : `${field.label}: danh sách không hợp lệ${optionsText(field)}`;
    case 'number[]':
      return Array.isArray(value) && value.every(isNum) ? null : `${field.label}: phải là danh sách số`;
  }
}

/**
 * Validates product specs against the category's admin-editable spec_schema and, when given, the typed
 * schema the engine relies on. Both must pass: spec_schema drives forms and filters, the typed schema
 * guarantees the compatibility rules receive well-formed values.
 */
export function validateSpecs(
  specs: Record<string, unknown>,
  fields: SpecField[],
  typed?: z.ZodType,
): SpecValidation {
  const issues: SpecIssue[] = [];
  const seen = new Set<string>();
  const add = (path: string, message: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    issues.push({ path, message });
  };

  for (const field of fields) {
    const problem = checkField(field, specs[field.key]);
    if (problem) add(`specs.${field.key}`, problem);
  }

  let typedValue: Record<string, unknown> = {};
  if (typed) {
    const parsed = typed.safeParse(specs);
    if (parsed.success) typedValue = parsed.data as Record<string, unknown>;
    else for (const i of parsed.error.issues) add(['specs', ...i.path.map(String)].join('.'), i.message);
  }

  const known = new Set([...fields.map((f) => f.key), ...Object.keys(typedValue)]);
  const value: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(specs)) if (known.has(k) && !isMissing(v)) value[k] = v;
  return { ok: issues.length === 0, issues, value: { ...value, ...typedValue } };
}
