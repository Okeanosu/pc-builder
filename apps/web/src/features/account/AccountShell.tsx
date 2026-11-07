'use client';

import { Cpu, LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';
import { useAuthActions } from '../auth/useAuthActions';

const NAV = [
  { href: '/account', label: 'Tổng quan', icon: User },
  { href: '/account/orders', label: 'Đơn hàng', icon: Package },
  { href: '/account/builds', label: 'Cấu hình đã lưu', icon: Cpu },
];

/** Account pages need a signed-in user; guests are sent to login and brought back afterwards. */
export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/account';
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const { logout } = useAuthActions();

  useEffect(() => {
    if (status === 'ready' && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [status, user, router, pathname]);

  const onLogout = async () => {
    await logout();
    toast({ title: 'Đã đăng xuất', tone: 'info' });
    router.replace('/');
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:px-6 lg:py-8">
      <nav aria-label="Tài khoản" className="lg:sticky lg:top-32">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/account' ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-surface text-fg shadow-raised'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
            <li className="shrink-0">
              <Link
                href="/admin"
                className="focus-ring flex h-10 items-center gap-2.5 rounded-sm px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Quản trị
              </Link>
            </li>
          )}
          <li className="shrink-0 lg:mt-2 lg:border-t lg:border-border lg:pt-2">
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={!user}
              className="focus-ring flex h-10 w-full items-center gap-2.5 rounded-sm px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-45"
            >
              <LogOut className="size-4" aria-hidden />
              Đăng xuất
            </button>
          </li>
        </ul>
      </nav>
      {/* Always rendered so Next can validate the page segment; pages show their own skeleton until auth settles. */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
