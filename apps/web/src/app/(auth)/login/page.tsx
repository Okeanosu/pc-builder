import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { LoginForm } from '@/features/auth/AuthForms';

export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">Đăng nhập</h1>
        <p className="text-sm text-muted">Giỏ hàng hiện tại sẽ được gộp vào tài khoản của bạn.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-md" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
