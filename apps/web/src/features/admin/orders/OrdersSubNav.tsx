'use client';

import { QrCode, Receipt } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/admin/orders', label: 'Danh sách đơn', icon: Receipt },
  { href: '/admin/orders/payments', label: 'Đối soát VietQR', icon: QrCode },
] as const;

/** Segmented switch between the order list and the bank-transfer reconciliation view. */
export function OrdersSubNav({ current }: { current: (typeof LINKS)[number]['href'] }) {
  return (
    <nav aria-label="Đơn hàng và thanh toán">
      <ul className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === current;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors [&_svg]:size-4',
                  active
                    ? 'bg-bg text-fg shadow-[0_0_0_1px_var(--color-border)]'
                    : 'text-muted hover:text-fg',
                )}
              >
                <Icon aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
