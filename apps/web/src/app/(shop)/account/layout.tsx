import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountShell } from '@/features/account/AccountShell';

export const metadata: Metadata = {
  title: { default: 'Tài khoản', template: '%s | PC Builder' },
  robots: { index: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
