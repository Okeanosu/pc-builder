import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Spinner } from '@/components/ui/Spinner';
import { AdvisorWorkspace } from '@/features/advisor/AdvisorWorkspace';

export const metadata: Metadata = {
  title: 'AI tư vấn cấu hình',
  description:
    'Nói nhu cầu và ngân sách, trợ lý AI chọn 3 cấu hình PC tương thích từ hàng có sẵn trong kho để bạn so sánh.',
};

function AdvisorFallback() {
  return (
    <WorkshopSurface className="grid min-h-[70dvh] flex-1 place-items-center">
      <Spinner size="lg" label="Đang mở trợ lý tư vấn" className="text-muted" />
    </WorkshopSurface>
  );
}

export default function AdvisorPage() {
  return (
    <Suspense fallback={<AdvisorFallback />}>
      <AdvisorWorkspace />
    </Suspense>
  );
}
