import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsListPage } from '@/features/admin/products/ProductsListPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Sản phẩm' };

export default function AdminProductsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductsListPage />
    </Suspense>
  );
}
