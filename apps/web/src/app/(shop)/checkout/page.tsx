import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckoutView } from '@/features/checkout/CheckoutView';

export const metadata: Metadata = { title: 'Thanh toán', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-10">
      <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
        Thanh toán
      </h1>
      <Suspense
        fallback={
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12" aria-busy>
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        }
      >
        <CheckoutView />
      </Suspense>
    </div>
  );
}
