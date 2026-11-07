import { type CategoryKey, SPEC_SCHEMAS, type SpecField } from '@pc/shared';

export const SPEC_TYPES: { value: SpecField['type']; label: string }[] = [
  { value: 'number', label: 'Số' },
  { value: 'string', label: 'Chuỗi' },
  { value: 'boolean', label: 'Có / không' },
  { value: 'enum', label: 'Một lựa chọn' },
  { value: 'enum[]', label: 'Nhiều lựa chọn' },
  { value: 'number[]', label: 'Danh sách số' },
];

export interface SchemaRow {
  /** Local identity for React keys; never sent. */
  rowId: string;
  key: string;
  label: string;
  type: SpecField['type'];
  unit: string;
  options: string;
  required: boolean;
  filterable: boolean;
}

let seq = 0;
const nextId = () => `row-${++seq}`;

export function toRows(fields: SpecField[]): SchemaRow[] {
  return fields.map((f) => ({
    rowId: nextId(),
    key: f.key,
    label: f.label,
    type: f.type,
    unit: f.unit ?? '',
    options: (f.options ?? []).join(', '),
    required: f.required,
    filterable: f.filterable,
  }));
}

export function newRow(): SchemaRow {
  return {
    rowId: nextId(),
    key: '',
    label: '',
    type: 'string',
    unit: '',
    options: '',
    required: false,
    filterable: false,
  };
}

export const hasOptions = (type: SpecField['type']) => type === 'enum' || type === 'enum[]';

export function toFields(rows: SchemaRow[]): SpecField[] {
  return rows.map((r) => {
    const options = r.options
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      key: r.key.trim(),
      label: r.label.trim(),
      type: r.type,
      ...(r.unit.trim() ? { unit: r.unit.trim() } : {}),
      ...(hasOptions(r.type) ? { options } : {}),
      required: r.required,
      filterable: r.filterable,
    };
  });
}

/** Keys the compatibility rules read from the typed schema; renaming or retyping them breaks the engine. */
export function engineKeys(category: CategoryKey): Set<string> {
  const schema = SPEC_SCHEMAS[category] as unknown as { shape?: Record<string, unknown> };
  return new Set(Object.keys(schema.shape ?? {}));
}

/** API 422 paths look like `3.options`; map them to `rowId.prop`. */
export function rowErrors(
  rows: SchemaRow[],
  details: { path: string; message: string }[],
): { errors: Record<string, string>; rest: string[] } {
  const errors: Record<string, string> = {};
  const rest: string[] = [];
  for (const d of details) {
    const [index, prop] = d.path.split('.');
    const row = rows[Number(index)];
    if (row && prop) errors[`${row.rowId}.${prop}`] ??= d.message;
    else rest.push(d.message);
  }
  return { errors, rest };
}

/** Same checks as the API, run before sending so the admin sees them per row. */
export function validateRows(rows: SchemaRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const r of rows) {
    const key = r.key.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) errors[`${r.rowId}.key`] = 'Chỉ gồm chữ và số, bắt đầu bằng chữ';
    else if (seen.has(key)) errors[`${r.rowId}.key`] = 'Khóa bị trùng';
    seen.set(key, r.rowId);
    if (!r.label.trim()) errors[`${r.rowId}.label`] = 'Nhập nhãn hiển thị';
    if (hasOptions(r.type) && !r.options.split(',').some((s) => s.trim())) {
      errors[`${r.rowId}.options`] = 'Kiểu lựa chọn cần danh sách giá trị';
    }
  }
  return errors;
}
