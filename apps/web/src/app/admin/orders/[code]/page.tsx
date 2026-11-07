import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderDetailRoute } from '@/features/admin/orders/OrderDetailPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default function AdminOrderDetailRoute({ params }: PageProps<'/admin/orders/[code]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetailRoute params={params} />
    </Suspense>
  );
}
