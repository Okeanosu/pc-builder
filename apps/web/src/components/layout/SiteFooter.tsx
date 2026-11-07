import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { DEFAULT_NAV_CATEGORIES, type NavCategory } from './SiteHeader';
import { ThemeToggle } from './ThemeToggle';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const TOOLS: FooterColumn = {
  title: 'Công cụ',
  links: [
    { label: 'AI tư vấn cấu hình', href: '/advisor' },
    { label: 'Tự build PC', href: '/builder' },
    { label: 'Giỏ hàng', href: '/cart' },
  ],
};

const ACCOUNT: FooterColumn = {
  title: 'Tài khoản',
  links: [
    { label: 'Đăng nhập', href: '/login' },
    { label: 'Tạo tài khoản', href: '/register' },
    { label: 'Đơn hàng của tôi', href: '/account/orders' },
  ],
};

interface SiteFooterProps {
  categories?: NavCategory[];
  /** Small print under the columns. */
  note?: ReactNode;
  className?: string;
}

export function SiteFooter({ categories = DEFAULT_NAV_CATEGORIES, note, className }: SiteFooterProps) {
  const columns: FooterColumn[] = [
    { title: 'Linh kiện', links: categories.map((c) => ({ label: c.label, href: c.href })) },
    TOOLS,
    ACCOUNT,
  ];
  return (
    <footer className={cn('border-t border-border bg-surface', className)}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] lg:px-6">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted">
            Linh kiện máy tính có sẵn trong kho, kèm trợ lý AI chọn giúp cấu hình tương thích và vừa ngân
            sách.
          </p>
          <p className="text-sm text-muted">Thanh toán chuyển khoản VietQR, đơn được xác nhận tự động.</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold text-fg">{col.title}</h2>
            <ul className={cn('grid gap-2', col.links.length > 5 && 'grid-cols-2 gap-x-6')}>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="focus-ring rounded-xs text-sm text-muted transition-colors hover:text-fg"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p>{note ?? 'Giá tham khảo thị trường, cập nhật theo tồn kho.'}</p>
          <div className="flex items-center gap-3">
            <span>Giao diện</span>
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </div>
    </footer>
  );
}
