'use client';

import { ChevronDown, LayoutDashboard, LogIn, LogOut, Package, User, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { usePortalContainer } from '@/components/ui/ThemeScope';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';
import { useAuthActions } from './useAuthActions';

const itemClass =
  'flex h-9 cursor-default select-none items-center gap-2.5 rounded-xs px-2.5 text-sm text-fg outline-none data-highlighted:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted';

function MenuLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu.Item asChild className={itemClass}>
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}

const triggerClass =
  'focus-ring inline-flex h-10 items-center gap-2 rounded-sm px-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2 max-lg:w-10 max-lg:justify-center max-lg:px-0';

/** Header account control: login/register for guests, account links and logout for signed-in users. */
export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const { logout } = useAuthActions();
  const container = usePortalContainer();
  const router = useRouter();
  const pathname = usePathname();
  const redirect = pathname && pathname !== '/login' && pathname !== '/register' ? pathname : '/';
  const firstName = user?.fullName.trim().split(/\s+/).pop() ?? '';

  if (status !== 'ready') {
    return (
      <span className={cn(triggerClass, 'pointer-events-none text-muted')} aria-hidden>
        <User className="size-5" />
      </span>
    );
  }

  const onLogout = async () => {
    await logout();
    toast({ title: 'Đã đăng xuất', tone: 'info' });
    if (pathname?.startsWith('/account')) router.replace('/');
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={triggerClass}
        aria-label={user ? `Tài khoản của ${user.fullName}` : 'Tài khoản'}
      >
        <User className="size-5 shrink-0" aria-hidden />
        <span className="max-w-28 truncate max-lg:sr-only">{user ? firstName : 'Đăng nhập'}</span>
        <ChevronDown className="size-4 text-muted max-lg:hidden" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-md border border-border bg-surface p-1 text-fg shadow-overlay data-[state=open]:animate-pop-in"
        >
          {user ? (
            <>
              <DropdownMenu.Label className="px-2.5 py-2">
                <span className="block truncate text-sm font-semibold">{user.fullName}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <MenuLink href="/account" icon={<User aria-hidden />}>
                Tài khoản
              </MenuLink>
              <MenuLink href="/account/orders" icon={<Package aria-hidden />}>
                Đơn hàng
              </MenuLink>
              {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                <MenuLink href="/admin" icon={<LayoutDashboard aria-hidden />}>
                  Quản trị
                </MenuLink>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item className={itemClass} onSelect={() => void onLogout()}>
                <LogOut aria-hidden />
                Đăng xuất
              </DropdownMenu.Item>
            </>
          ) : (
            <>
              <MenuLink href={`/login?redirect=${encodeURIComponent(redirect)}`} icon={<LogIn aria-hidden />}>
                Đăng nhập
              </MenuLink>
              <MenuLink
                href={`/register?redirect=${encodeURIComponent(redirect)}`}
                icon={<UserPlus aria-hidden />}
              >
                Tạo tài khoản
              </MenuLink>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
