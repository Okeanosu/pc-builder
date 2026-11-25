import { ApiError } from '@/lib/api';

export interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;

/** Same length limits as registration (bcrypt reads at most 72 bytes). */
const MIN = 8;
const MAX = 72;

export function validatePasswordChange(
  v: PasswordFormValues,
):
  | { ok: true; data: { currentPassword: string; newPassword: string } }
  | { ok: false; errors: PasswordFormErrors } {
  const errors: PasswordFormErrors = {};
  if (!v.currentPassword) errors.currentPassword = 'Nhập mật khẩu hiện tại';
  if (v.newPassword.length < MIN) errors.newPassword = `Mật khẩu mới cần ít nhất ${MIN} ký tự`;
  else if (v.newPassword.length > MAX) errors.newPassword = `Mật khẩu mới tối đa ${MAX} ký tự`;
  else if (v.newPassword === v.currentPassword)
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (!v.confirmPassword) errors.confirmPassword = 'Nhập lại mật khẩu mới';
  else if (v.confirmPassword !== v.newPassword) errors.confirmPassword = 'Mật khẩu nhập lại chưa khớp';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { currentPassword: v.currentPassword, newPassword: v.newPassword } };
}

/** Where to show a failed change: on the current-password field, or above the form. */
export function passwordChangeError(err: unknown): { field?: 'currentPassword'; message: string } {
  if (err instanceof ApiError) {
    if (err.code === 'INVALID_CURRENT_PASSWORD') {
      return { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng' };
    }
    if (err.status === 401) return { message: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi đổi mật khẩu.' };
    if (err.status === 429) return { message: 'Bạn thử quá nhiều lần. Chờ vài phút rồi thử lại.' };
    return { message: err.message || 'Chưa đổi được mật khẩu. Thử lại sau ít giây.' };
  }
  return { message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
}
