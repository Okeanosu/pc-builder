'use client';

import { CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BuildError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState
        tone="error"
        icon={<CloudOff />}
        title="Chưa tải được cấu hình"
        description="Máy chủ đang không phản hồi. Thử tải lại sau vài giây."
        actions={<Button onClick={() => retry()}>Thử lại</Button>}
      />
    </div>
  );
}
