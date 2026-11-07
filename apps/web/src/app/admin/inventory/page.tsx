import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InventoryPage } from '@/features/admin/inventory/InventoryPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Tồn kho' };

export default function AdminInventoryRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InventoryPage />
    </Suspense>
  );
}
