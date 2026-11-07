import { ArrowLeft, Cpu, QrCode, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';

const PERKS = [
  { icon: <Cpu aria-hidden />, text: 'Lưu cấu hình AI tư vấn để mua sau hoặc gửi bạn bè' },
  { icon: <ShieldCheck aria-hidden />, text: 'Theo dõi đơn hàng và tiến độ lắp ráp' },
  { icon: <QrCode aria-hidden />, text: 'Điền sẵn thông tin giao hàng khi thanh toán' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <WorkshopSurface className="hidden flex-col justify-between gap-10 p-10 lg:flex">
        <Logo />
        <div className="flex max-w-md flex-col gap-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-fg">
            Một tài khoản cho cả AI tư vấn, giỏ hàng và đơn lắp ráp
          </h2>
          <ul className="flex flex-col gap-4">
            {PERKS.map((p) => (
              <li
                key={p.text}
                className="flex items-start gap-3 text-sm text-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-accent-ink"
              >
                {p.icon}
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted">
          Mua không cần tài khoản vẫn được; đăng nhập chỉ giúp theo dõi dễ hơn.
        </p>
      </WorkshopSurface>
      <div className="flex flex-col bg-bg">
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <span className="lg:invisible">
            <Logo />
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Về cửa hàng
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main
          id="noi-dung"
          className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:px-8 sm:pt-0"
        >
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
