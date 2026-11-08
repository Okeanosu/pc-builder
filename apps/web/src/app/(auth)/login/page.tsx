import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { LoginForm } from '@/features/auth/AuthForms';

export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
          Đăng nhập
        </h1>
        <p className="text-sm text-muted">Giỏ hàng hiện tại sẽ được gộp vào tài khoản của bạn.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
