/** The part of a zod issue the forms need; kept structural so this module does not import zod. */
export interface FormIssue {
  code: string;
  path: readonly PropertyKey[];
  message: string;
}

/** Vietnamese message per field and zod issue code (`too_small`, `invalid_format`…); `default` catches the rest. */
export type FieldMessages = Record<string, Partial<Record<string, string>> & { default: string }>;

/** First issue per top-level field, rewritten into the form's Vietnamese copy. */
export function fieldErrors(issues: readonly FormIssue[], messages: FieldMessages): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (!field || out[field]) continue;
    const copy = messages[field];
    out[field] = copy ? (copy[issue.code] ?? copy.default) : issue.message;
  }
  return out;
}

/** Only same-site paths may be used after login, so `?redirect=` cannot bounce users to another origin. */
export function safeRedirect(target: string | null | undefined, fallback = '/account'): string {
  if (!target?.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback;
  }
  return target;
}

export const LOGIN_MESSAGES: FieldMessages = {
  email: { default: 'Email chưa đúng định dạng, ví dụ: ten@gmail.com' },
  password: { default: 'Vui lòng nhập mật khẩu' },
};

export const REGISTER_MESSAGES: FieldMessages = {
  email: { default: 'Email chưa đúng định dạng, ví dụ: ten@gmail.com' },
  password: {
    too_small: 'Mật khẩu cần ít nhất 8 ký tự',
    too_big: 'Mật khẩu tối đa 72 ký tự',
    default: 'Mật khẩu chưa hợp lệ',
  },
  fullName: {
    too_small: 'Họ tên cần ít nhất 2 ký tự',
    too_big: 'Họ tên tối đa 100 ký tự',
    default: 'Vui lòng nhập họ tên',
  },
  phone: { default: 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0' },
};
