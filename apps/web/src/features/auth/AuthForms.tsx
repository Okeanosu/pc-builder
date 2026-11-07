'use client';

import { loginSchema, registerSchema } from '@pc/shared';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ComponentProps, type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage, fieldErrors, LOGIN_MESSAGES, REGISTER_MESSAGES, safeRedirect } from './form-errors';
import { useAuthActions } from './useAuthActions';

const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== 'production';
const DEMO_ACCOUNTS = [
  { label: 'Khách hàng', email: 'khach@pcbuilder.vn', password: 'Khach@123' },
  { label: 'Nhân viên', email: 'staff@pcbuilder.vn', password: 'Staff@123' },
  { label: 'Quản trị', email: 'admin@pcbuilder.vn', password: 'Admin@123' },
];

/** Where to go after auth, and a redirect for visitors who are already signed in. */
function useAuthRedirect() {
  const router = useRouter();
  const target = safeRedirect(useSearchParams().get('redirect'), '/account');
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const done = useRef(false);
  useEffect(() => {
    if (status === 'ready' && user && !done.current) {
      done.current = true;
      router.replace(target);
    }
  }, [status, user, router, target]);
  return target;
}

function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="focus-ring -me-1 grid size-8 place-items-center rounded-xs text-muted hover:text-fg"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      }
    />
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-danger/40 bg-danger/8 px-3 py-2.5 text-sm text-danger-ink"
    >
      {message}
    </p>
  );
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

export function LoginForm() {
  const target = useAuthRedirect();
  const { login } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues, LOGIN_MESSAGES));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      toast({ title: `Chào ${firstName(user.fullName)}, mừng bạn quay lại`, tone: 'success' });
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <Field label="Email" required error={errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten@gmail.com"
        />
      </Field>
      <Field label="Mật khẩu" required error={errors.password}>
        <PasswordInput
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" loading={busy}>
        Đăng nhập
      </Button>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{' '}
        <Link
          href={`/register?redirect=${encodeURIComponent(target)}`}
          className="focus-ring rounded-xs font-semibold text-accent-ink hover:underline"
        >
          Tạo tài khoản
        </Link>
      </p>
      {SHOW_DEMO_ACCOUNTS && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border-strong p-3">
          <span className="text-xs font-semibold text-muted">Tài khoản demo (chỉ hiện khi chạy dev)</span>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                  setErrors({});
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export function RegisterForm() {
  const target = useAuthRedirect();
  const { register } = useAuthActions();
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof values) => (v: string) => {
    setValues((s) => ({ ...s, [key]: v }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const phone = values.phone.replace(/[\s.-]/g, '');
    const parsed = registerSchema.safeParse({
      fullName: values.fullName,
      email: values.email.trim(),
      password: values.password,
      phone: phone || undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues, REGISTER_MESSAGES));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const user = await register(parsed.data);
      toast({ title: `Chào ${firstName(user.fullName)}, tài khoản đã sẵn sàng`, tone: 'success' });
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <Field label="Họ và tên" required error={errors.fullName}>
        <Input
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(e) => set('fullName')(e.target.value)}
          maxLength={100}
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={(e) => set('email')(e.target.value)}
          placeholder="ten@gmail.com"
        />
      </Field>
      <Field label="Số điện thoại" error={errors.phone} hint="Không bắt buộc. Dùng để điền sẵn khi đặt hàng.">
        <Input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          mono
          value={values.phone}
          onChange={(e) => set('phone')(e.target.value)}
          placeholder="0912345678"
          maxLength={14}
        />
      </Field>
      <Field label="Mật khẩu" required error={errors.password} hint="Ít nhất 8 ký tự.">
        <PasswordInput
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set('password')(e.target.value)}
          maxLength={72}
        />
      </Field>
      <Button type="submit" size="lg" loading={busy}>
        Tạo tài khoản
      </Button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(target)}`}
          className="focus-ring rounded-xs font-semibold text-accent-ink hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
