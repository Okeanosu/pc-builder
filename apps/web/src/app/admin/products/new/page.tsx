import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewProductRoute } from '@/features/admin/products/ProductEditor';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Thêm sản phẩm' };

export default function AdminNewProductRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewProductRoute />
    </Suspense>
  );
}
