import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChatDetailRoute } from '@/features/admin/chats/ChatDetailPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Phiên hội thoại' };

export default function AdminChatDetailRoute({ params }: PageProps<'/admin/chats/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChatDetailRoute params={params} />
    </Suspense>
  );
}
