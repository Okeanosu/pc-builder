import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { passwordChangeError, validatePasswordChange } from './password-form';

const valid = {
  currentPassword: 'Khach@123',
  newPassword: 'MatKhauMoi@2026',
  confirmPassword: 'MatKhauMoi@2026',
};

describe('validatePasswordChange', () => {
  it('returns the API body for a valid change', () => {
    expect(validatePasswordChange(valid)).toEqual({
      ok: true,
      data: { currentPassword: 'Khach@123', newPassword: 'MatKhauMoi@2026' },
    });
  });

  it('asks for every field in Vietnamese', () => {
    const r = validatePasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
    expect(r).toEqual({
      ok: false,
      errors: {
        currentPassword: 'Nhập mật khẩu hiện tại',
        newPassword: 'Mật khẩu mới cần ít nhất 8 ký tự',
        confirmPassword: 'Nhập lại mật khẩu mới',
      },
    });
  });

  it('applies the register length rules to the new password', () => {
    const short = validatePasswordChange({ ...valid, newPassword: 'abc1234', confirmPassword: 'abc1234' });
    expect(short.ok === false && short.errors.newPassword).toBe('Mật khẩu mới cần ít nhất 8 ký tự');
    const long = 'a'.repeat(73);
    const tooLong = validatePasswordChange({ ...valid, newPassword: long, confirmPassword: long });
    expect(tooLong.ok === false && tooLong.errors.newPassword).toBe('Mật khẩu mới tối đa 72 ký tự');
  });

  it('rejects a confirmation that does not match and a new password equal to the current one', () => {
    const mismatch = validatePasswordChange({ ...valid, confirmPassword: 'MatKhauMoi@2025' });
    expect(mismatch.ok === false && mismatch.errors.confirmPassword).toBe('Mật khẩu nhập lại chưa khớp');
    const same = validatePasswordChange({
      currentPassword: 'Khach@123',
      newPassword: 'Khach@123',
      confirmPassword: 'Khach@123',
    });
    expect(same.ok === false && same.errors.newPassword).toBe('Mật khẩu mới phải khác mật khẩu hiện tại');
  });

  it('keeps spaces: a password is compared exactly as typed', () => {
    const r = validatePasswordChange({ ...valid, confirmPassword: `${valid.newPassword} ` });
    expect(r.ok).toBe(false);
  });
});

describe('passwordChangeError', () => {
  it('puts a wrong current password on that field', () => {
    expect(passwordChangeError(new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'Invalid'))).toEqual({
      field: 'currentPassword',
      message: 'Mật khẩu hiện tại không đúng',
    });
  });

  it('explains an expired session, rate limiting and network failures', () => {
    expect(passwordChangeError(new ApiError(401, 'TOKEN_EXPIRED', 'Expired'))).toEqual({
      message: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi đổi mật khẩu.',
    });
    expect(passwordChangeError(new ApiError(429, 'RATE_LIMITED', 'Too many'))).toEqual({
      message: 'Bạn thử quá nhiều lần. Chờ vài phút rồi thử lại.',
    });
    expect(passwordChangeError(new TypeError('Failed to fetch'))).toEqual({
      message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    });
  });

  it('passes other server messages through', () => {
    expect(passwordChangeError(new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu quá yếu'))).toEqual({
      message: 'Mật khẩu quá yếu',
    });
  });
});
