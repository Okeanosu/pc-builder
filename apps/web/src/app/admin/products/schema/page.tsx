import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SpecSchemaPage } from '@/features/admin/products/SpecSchemaPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Lược đồ thông số' };

export default function AdminSpecSchemaRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SpecSchemaPage />
    </Suspense>
  );
}
