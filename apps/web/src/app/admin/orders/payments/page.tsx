import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentsPage } from '@/features/admin/orders/PaymentsPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Đối soát VietQR' };

export default function AdminPaymentsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentsPage />
    </Suspense>
  );
}
