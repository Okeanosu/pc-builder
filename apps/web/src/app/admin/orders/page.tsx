import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersPage } from '@/features/admin/orders/OrdersPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Đơn hàng' };

export default function AdminOrdersRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdersPage />
    </Suspense>
  );
}
