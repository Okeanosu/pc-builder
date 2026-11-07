import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BenchmarksPage } from '@/features/admin/benchmarks/BenchmarksPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Benchmark' };

export default function AdminBenchmarksRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BenchmarksPage />
    </Suspense>
  );
}
