import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EditProductRoute } from '@/features/admin/products/ProductEditor';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Sửa sản phẩm' };

export default function AdminEditProductRoute({ params }: PageProps<'/admin/products/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditProductRoute params={params} />
    </Suspense>
  );
}
