import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentView } from '@/features/checkout/PaymentView';

export const metadata: Metadata = { title: 'Thanh toán VietQR', robots: { index: false } };

async function PayContent({ params }: Pick<PageProps<'/orders/[code]/pay'>, 'params'>) {
  const { code } = await params;
  await connection();
  // Request-time server clock: the countdown follows it even when the shopper's device clock is wrong.
  return <PaymentView code={decodeURIComponent(code)} serverTime={Date.now()} />;
}

export default function PayPage({ params }: PageProps<'/orders/[code]/pay'>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PayContent params={params} />
      </Suspense>
    </div>
  );
}
