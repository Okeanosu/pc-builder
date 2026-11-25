import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrderDetailView } from '@/features/account/OrderDetailView';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng', robots: { index: false } };

async function OrderContent({ params }: Pick<PageProps<'/orders/[code]'>, 'params'>) {
  const { code } = await params;
  return <OrderDetailView code={decodeURIComponent(code)} />;
}

export default function OrderPage({ params }: PageProps<'/orders/[code]'>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <OrderContent params={params} />
      </Suspense>
    </div>
  );
}
