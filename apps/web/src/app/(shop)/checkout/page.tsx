import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckoutView } from '@/features/checkout/CheckoutView';

export const metadata: Metadata = { title: 'Thanh toán', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">Thanh toán</h1>
      <Suspense
        fallback={
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-busy>
            <Skeleton className="h-96 w-full rounded-lg" />
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        }
      >
        <CheckoutView />
      </Suspense>
    </div>
  );
}
