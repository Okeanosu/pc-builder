import { loginSchema, registerSchema } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage, fieldErrors, LOGIN_MESSAGES, REGISTER_MESSAGES, safeRedirect } from './form-errors';

describe('auth form messages', () => {
  it('localises login issues', () => {
    const r = loginSchema.safeParse({ email: 'abc', password: '' });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(fieldErrors(r.error.issues, LOGIN_MESSAGES)).toEqual({
      email: 'Email chưa đúng định dạng, ví dụ: ten@gmail.com',
      password: 'Vui lòng nhập mật khẩu',
    });
  });

  it('picks the message by issue code', () => {
    const r = registerSchema.safeParse({ email: 'a@b.vn', password: 'short', fullName: 'A', phone: '123' });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(fieldErrors(r.error.issues, REGISTER_MESSAGES)).toEqual({
      password: 'Mật khẩu cần ít nhất 8 ký tự',
      fullName: 'Họ tên cần ít nhất 2 ký tự',
      phone: 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0',
    });
  });

  it('falls back to the schema message for fields without copy', () => {
    expect(fieldErrors([{ code: 'custom', path: ['other'], message: 'Lỗi' }], LOGIN_MESSAGES)).toEqual({
      other: 'Lỗi',
    });
  });
});

describe('safeRedirect', () => {
  it('allows same-site paths only', () => {
    expect(safeRedirect('/checkout?build=1')).toBe('/checkout?build=1');
    expect(safeRedirect('//evil.com')).toBe('/account');
    expect(safeRedirect('https://evil.com')).toBe('/account');
    expect(safeRedirect('/\\evil.com')).toBe('/account');
    expect(safeRedirect(null, '/')).toBe('/');
  });
});

describe('apiErrorMessage', () => {
  it('passes server copy through and replaces network failures', () => {
    const apiError = Object.assign(new Error('Email đã được sử dụng'), { status: 409 });
    expect(apiErrorMessage(apiError)).toBe('Email đã được sử dụng');
    expect(apiErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    );
  });
});
