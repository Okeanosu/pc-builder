import type { Metadata } from 'next';
import { AdminLayoutClient } from '@/features/admin/AdminLayoutClient';

// Admin pages render only after the client knows the user (the refresh cookie lives on the API origin),
// so every admin segment, this layout and each page, opts out of instant-navigation validation.
export const instant = false;

export const metadata: Metadata = {
  title: { template: '%s · Quản trị PC Builder', default: 'Quản trị PC Builder' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
