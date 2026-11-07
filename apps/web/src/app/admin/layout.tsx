import type { Metadata } from 'next';
import { AdminLayoutClient } from '@/features/admin/AdminLayoutClient';

export const metadata: Metadata = {
  title: { template: '%s · Quản trị PC Builder', default: 'Quản trị PC Builder' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
