import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentView } from '@/features/checkout/PaymentView';

export const metadata: Metadata = { title: 'Thanh toán VietQR', robots: { index: false } };

async function PayContent({ params }: Pick<PageProps<'/orders/[code]/pay'>, 'params'>) {
  const { code } = await params;
  return <PaymentView code={decodeURIComponent(code)} />;
}

export default function PayPage({ params }: PageProps<'/orders/[code]/pay'>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <PayContent params={params} />
      </Suspense>
    </div>
  );
}
