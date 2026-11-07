import { ApiError } from '@/lib/api';

export interface FieldIssue {
  path: string;
  message: string;
}

/** Field path → message. Spec paths keep their `specs.` prefix; array indexes are folded into the field. */
export type FieldErrors = Record<string, string>;

const ZOD_MESSAGES: [RegExp, string][] = [
  [/expected int/i, 'Phải là số nguyên'],
  [/Too small: expected number to be >0/i, 'Phải lớn hơn 0'],
  [/Too small: expected number to be >=0/i, 'Không được âm'],
  [/Too small: expected (array|string)/i, 'Cần ít nhất một giá trị'],
  [/Too small/i, 'Giá trị quá nhỏ'],
  [/Too big/i, 'Giá trị quá lớn'],
  [/Invalid option|expected one of/i, 'Giá trị không nằm trong danh sách cho phép'],
  [/expected number/i, 'Phải là số'],
  [/expected boolean/i, 'Phải là có/không'],
  [/expected string/i, 'Phải là chuỗi ký tự'],
  [/expected array/i, 'Phải là danh sách'],
  [/Invalid input/i, 'Giá trị không hợp lệ'],
];

/** The typed spec schemas answer in zod's English defaults; everything else is already Vietnamese. */
export function localizeIssue(message: string): string {
  for (const [pattern, text] of ZOD_MESSAGES) if (pattern.test(message)) return text;
  return message;
}

/** `specs.memoryTypes.0` → `specs.memoryTypes`, `price` → `price`. */
export function fieldKeyOf(path: string): string {
  const parts = path.split('.').filter(Boolean);
  if (parts[0] === 'specs') return parts.slice(0, 2).join('.');
  return parts[0] ?? '';
}

function isIssueList(details: unknown): details is FieldIssue[] {
  return (
    Array.isArray(details) &&
    details.every(
      (d) => d && typeof d === 'object' && typeof d.path === 'string' && typeof d.message === 'string',
    )
  );
}

/**
 * Splits an API error into per-field messages (422 VALIDATION_ERROR, 409 DUPLICATE) and a
 * form-level message for whatever cannot be attached to an input.
 */
export function toFieldErrors(
  err: unknown,
  knownFields?: Iterable<string>,
): { fields: FieldErrors; form: string | null } {
  if (!(err instanceof ApiError)) {
    return { fields: {}, form: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
  }
  const known = knownFields ? new Set(knownFields) : null;
  const fields: FieldErrors = {};
  const leftovers: string[] = [];

  if (err.code === 'DUPLICATE' && err.details && typeof err.details === 'object') {
    const field = (err.details as { field?: unknown }).field;
    if (typeof field === 'string') {
      fields[field] = err.message;
      return { fields, form: null };
    }
  }

  if (isIssueList(err.details)) {
    for (const issue of err.details) {
      const key = fieldKeyOf(issue.path);
      const message = localizeIssue(issue.message);
      if (key && (!known || known.has(key))) {
        fields[key] ??= message;
      } else {
        leftovers.push(issue.path ? `${issue.path}: ${message}` : message);
      }
    }
    if (Object.keys(fields).length > 0 || leftovers.length > 0) {
      return { fields, form: leftovers.length > 0 ? leftovers.join(' · ') : null };
    }
  }
  return { fields, form: err.message };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
    return err.message;
  }
  return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
}
