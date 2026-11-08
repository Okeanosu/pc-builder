'use client';

import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth';
import { FormError, PasswordInput } from '../auth/AuthForms';
import {
  type PasswordFormErrors,
  type PasswordFormValues,
  passwordChangeError,
  validatePasswordChange,
} from './password-form';

const EMPTY: PasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof PasswordFormValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = validatePasswordChange(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await changePassword(result.data.currentPassword, result.data.newPassword);
      setValues(EMPTY);
      toast({
        title: 'Đã đổi mật khẩu',
        description: 'Lần đăng nhập sau hãy dùng mật khẩu mới.',
        tone: 'success',
      });
    } catch (err) {
      const failure = passwordChangeError(err);
      if (failure.field) setErrors({ [failure.field]: failure.message });
      else setFormError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="change-password-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5 border-b border-border pb-3">
        <h2 id="change-password-title" className="text-lg font-semibold text-fg">
          Đổi mật khẩu
        </h2>
        <p className="text-sm text-muted">Dùng ít nhất 8 ký tự và khác mật khẩu đang dùng.</p>
      </div>
      <form method="post" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-3 sm:items-start">
        {formError && (
          <div className="sm:col-span-3">
            <FormError message={formError} />
          </div>
        )}
        <Field label="Mật khẩu hiện tại" required error={errors.currentPassword}>
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={(e) => set('currentPassword')(e.target.value)}
          />
        </Field>
        <Field label="Mật khẩu mới" required error={errors.newPassword}>
          <PasswordInput
            name="newPassword"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(e) => set('newPassword')(e.target.value)}
          />
        </Field>
        <Field label="Nhập lại mật khẩu mới" required error={errors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => set('confirmPassword')(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" loading={busy}>
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </section>
  );
}
