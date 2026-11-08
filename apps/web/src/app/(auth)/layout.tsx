import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const PERKS = [
  'Lưu cấu hình AI tư vấn để mua sau hoặc gửi bạn bè',
  'Theo dõi đơn hàng và tiến độ lắp ráp',
  'Điền sẵn thông tin giao hàng khi thanh toán',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 lg:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Về cửa hàng
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="noi-dung" className="flex flex-1 justify-center px-4 pt-10 pb-16 sm:pt-16 lg:pt-20">
        <div className="flex w-full max-w-sm flex-col gap-10">
          {children}
          <section aria-labelledby="auth-perks" className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 id="auth-perks" className="text-sm font-medium text-fg">
              Một tài khoản cho cả AI tư vấn, giỏ hàng và đơn lắp ráp
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-muted">
              {PERKS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Mua không cần tài khoản vẫn được; đăng nhập chỉ giúp theo dõi dễ hơn.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
