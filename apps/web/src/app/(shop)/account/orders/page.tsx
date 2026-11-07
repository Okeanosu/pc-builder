import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MyOrders } from '@/features/account/AccountPages';

export const metadata: Metadata = { title: 'Đơn hàng của tôi' };

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
      <MyOrders />
    </Suspense>
  );
}
