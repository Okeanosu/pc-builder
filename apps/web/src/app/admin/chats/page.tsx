import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChatsPage } from '@/features/admin/chats/ChatsPage';
import { PageSkeleton } from '@/features/admin/ui';

export const instant = false;
export const metadata: Metadata = { title: 'Hội thoại AI' };

export default function AdminChatsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChatsPage />
    </Suspense>
  );
}
