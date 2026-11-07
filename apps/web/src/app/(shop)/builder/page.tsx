import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Spinner } from '@/components/ui/Spinner';
import { BuilderWorkspace } from '@/features/builder/BuilderWorkspace';

export const metadata: Metadata = {
  title: 'Tự build PC',
  description:
    'Tự chọn 8 linh kiện PC với kiểm tra tương thích tức thì: socket, RAM, kích thước, công suất nguồn và ngân sách.',
};

function BuilderFallback() {
  return (
    <WorkshopSurface className="grid min-h-[70dvh] flex-1 place-items-center">
      <Spinner size="lg" label="Đang mở Customizer" className="text-accent-ink" />
    </WorkshopSurface>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<BuilderFallback />}>
      <BuilderWorkspace />
    </Suspense>
  );
}
