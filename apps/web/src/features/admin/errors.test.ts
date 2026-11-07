import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { fieldKeyOf, localizeIssue, toFieldErrors } from './errors';

describe('fieldKeyOf', () => {
  it('folds spec array indexes into the spec field', () => {
    expect(fieldKeyOf('specs.memoryTypes.0')).toBe('specs.memoryTypes');
    expect(fieldKeyOf('specs.cores')).toBe('specs.cores');
    expect(fieldKeyOf('price')).toBe('price');
    expect(fieldKeyOf('')).toBe('');
  });
});

describe('localizeIssue', () => {
  it('translates zod defaults from the typed spec schema and keeps Vietnamese messages', () => {
    expect(localizeIssue('Invalid input: expected int, received number')).toBe('Phải là số nguyên');
    expect(localizeIssue('Too small: expected number to be >0')).toBe('Phải lớn hơn 0');
    expect(localizeIssue('Invalid option: expected one of "AM4"|"AM5"')).toContain('danh sách');
    expect(localizeIssue('Số nhân: phải là số')).toBe('Số nhân: phải là số');
  });
});

describe('toFieldErrors', () => {
  it('maps 422 issue paths onto inputs and keeps the first message per field', () => {
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
      { path: 'specs.cores', message: 'Invalid input: expected int, received number' },
      { path: 'specs.cores', message: 'Too small: expected number to be >0' },
      { path: 'salePrice', message: 'Giá khuyến mãi phải nhỏ hơn giá gốc' },
    ]);
    expect(toFieldErrors(err)).toEqual({
      fields: { 'specs.cores': 'Phải là số nguyên', salePrice: 'Giá khuyến mãi phải nhỏ hơn giá gốc' },
      form: null,
    });
  });

  it('puts issues for unknown fields in the form-level message', () => {
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
      { path: 'specs.threads', message: 'Too small: expected number to be >0' },
      { path: 'price', message: 'Too big' },
    ]);
    const result = toFieldErrors(err, ['price', 'specs.cores']);
    expect(result.fields).toEqual({ price: 'Giá trị quá lớn' });
    expect(result.form).toBe('specs.threads: Phải lớn hơn 0');
  });

  it('attaches 409 duplicates to the named field', () => {
    const err = new ApiError(409, 'DUPLICATE', 'SKU đã tồn tại', { field: 'sku' });
    expect(toFieldErrors(err)).toEqual({ fields: { sku: 'SKU đã tồn tại' }, form: null });
  });

  it('falls back to the error message, or a network hint for non-API errors', () => {
    expect(toFieldErrors(new ApiError(403, 'FORBIDDEN', 'Không có quyền')).form).toBe('Không có quyền');
    expect(toFieldErrors(new TypeError('fetch failed')).form).toContain('Không kết nối');
  });
});
