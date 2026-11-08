import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { RegisterForm } from '@/features/auth/AuthForms';

export const metadata: Metadata = { title: 'Tạo tài khoản', robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
          Tạo tài khoản
        </h1>
        <p className="text-sm text-muted">Mất chưa đến một phút. Giỏ hàng hiện tại được giữ nguyên.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
