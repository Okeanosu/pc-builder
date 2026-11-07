import { loginSchema, registerSchema } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { fieldErrors, LOGIN_MESSAGES, REGISTER_MESSAGES, safeRedirect } from '../auth/form-errors';
import { validateCheckout } from './checkout-form';
import { formatCountdown, remainingMs } from './countdown';

const valid = {
  shippingName: 'Nguyễn Văn An',
  phone: '0912 345 678',
  address: '12 Trần Đại Nghĩa, Hai Bà Trưng, Hà Nội',
  note: '',
};

describe('validateCheckout', () => {
  it('accepts a valid form, normalising the phone and dropping an empty note', () => {
    const r = validateCheckout(valid, 'build-1');
    expect(r).toEqual({
      ok: true,
      data: {
        shippingName: 'Nguyễn Văn An',
        phone: '0912345678',
        address: '12 Trần Đại Nghĩa, Hai Bà Trưng, Hà Nội',
        buildId: 'build-1',
      },
    });
  });

  it('returns one Vietnamese message per invalid field', () => {
    const r = validateCheckout({ shippingName: 'A', phone: '12345', address: 'ngắn', note: 'x'.repeat(501) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({
      shippingName: 'Vui lòng nhập họ tên người nhận (ít nhất 2 ký tự)',
      phone: 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0, ví dụ 0912345678',
      address: 'Địa chỉ cần ít nhất 10 ký tự: số nhà, đường, phường/xã, tỉnh/thành',
      note: 'Ghi chú tối đa 500 ký tự',
    });
  });

  it('omits buildId for a retail order', () => {
    const r = validateCheckout(valid);
    expect(r.ok && 'buildId' in r.data && r.data.buildId !== undefined).toBe(false);
  });
});

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

describe('countdown', () => {
  const now = Date.parse('2026-11-07T10:00:00.000Z');

  it('computes the time left, clamped at zero', () => {
    expect(remainingMs('2026-11-07T10:14:32.000Z', now)).toBe(872_000);
    expect(remainingMs('2026-11-07T09:59:00.000Z', now)).toBe(0);
    expect(remainingMs(null, now)).toBeNull();
    expect(remainingMs('not a date', now)).toBeNull();
  });

  it('formats as mm:ss, or h:mm:ss past an hour, rounding up', () => {
    expect(formatCountdown(872_000)).toBe('14:32');
    expect(formatCountdown(871_100)).toBe('14:32');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
  });
});
