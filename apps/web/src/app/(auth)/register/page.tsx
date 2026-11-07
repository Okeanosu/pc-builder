import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { RegisterForm } from '@/features/auth/AuthForms';

export const metadata: Metadata = { title: 'Tạo tài khoản', robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">Tạo tài khoản</h1>
        <p className="text-sm text-muted">Mất chưa đến một phút. Giỏ hàng hiện tại được giữ nguyên.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-md" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
