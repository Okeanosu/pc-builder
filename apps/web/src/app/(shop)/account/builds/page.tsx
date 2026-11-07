import type { Metadata } from 'next';
import { MyBuilds } from '@/features/account/AccountPages';

export const metadata: Metadata = { title: 'Cấu hình đã lưu' };

export default function MyBuildsPage() {
  return <MyBuilds />;
}
