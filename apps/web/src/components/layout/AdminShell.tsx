'use client';

import { ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, Suspense, useState } from 'react';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/Drawer';
import { cn } from '@/lib/cn';
import { ADMIN_NAV } from './admin-nav';
import { LogoMark } from './Logo';

function isActive(href: string, current: string | null) {
  if (!current) return false;
  return href === '/admin' ? current === '/admin' : current === href || current.startsWith(`${href}/`);
}

function NavList({ current, onNavigate }: { current: string | null; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, current);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'focus-ring flex h-9 items-center gap-3 rounded-sm px-3 text-sm transition-colors',
                active ? 'bg-surface-2 font-medium text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** usePathname suspends under dynamic admin routes, so it lives behind its own Suspense boundary. */
function PathAwareNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList current={pathname} onNavigate={onNavigate} />;
}

function SidebarNav({ activeHref, onNavigate }: { activeHref?: string; onNavigate?: () => void }) {
  if (activeHref !== undefined) return <NavList current={activeHref} onNavigate={onNavigate} />;
  return (
    <Suspense fallback={<NavList current={null} />}>
      <PathAwareNav onNavigate={onNavigate} />
    </Suspense>
  );
}

function SidebarBody({
  activeHref,
  user,
  onNavigate,
}: {
  activeHref?: string;
  user?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <div className="flex h-8 items-center gap-2.5 px-3 text-fg">
        <LogoMark className="size-5" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold font-stretch-expanded tracking-[-0.02em]">PC Builder</span>
          <span className="text-xs text-muted">Quản trị cửa hàng</span>
        </div>
      </div>
      <nav aria-label="Quản trị" className="flex-1">
        <SidebarNav activeHref={activeHref} onNavigate={onNavigate} />
      </nav>
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {user && <div className="px-3">{user}</div>}
        <Link
          href="/"
          className="focus-ring flex h-9 items-center gap-3 rounded-sm px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Về cửa hàng
        </Link>
      </div>
    </div>
  );
}

interface AdminShellProps {
  children: ReactNode;
  /** Page title in the top bar. */
  title?: ReactNode;
  /** Page-level actions in the top bar (e.g. "Thêm sản phẩm"). */
  actions?: ReactNode;
  /** Signed-in staff member (name, role, sign-out). */
  user?: ReactNode;
  /** Force the active nav item; otherwise derived from the URL. */
  activeHref?: string;
  /** Fill the parent instead of the viewport (previews, embedded demos). */
  embedded?: boolean;
  className?: string;
}

export function AdminShell({
  children,
  title,
  actions,
  user,
  activeHref,
  embedded,
  className,
}: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={cn('flex bg-bg text-fg', embedded ? 'h-full' : 'min-h-dvh', className)}>
      <aside
        className={cn(
          'hidden w-60 shrink-0 border-e border-border bg-bg lg:block',
          embedded ? 'h-full' : 'sticky top-0 h-dvh',
        )}
      >
        <SidebarBody activeHref={activeHref} user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur-md lg:px-8',
            !embedded && 'sticky top-0',
          )}
        >
          <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerTrigger
              aria-label="Mở menu quản trị"
              className="focus-ring -ms-2 inline-flex size-10 items-center justify-center rounded-full text-fg hover:bg-surface-2 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </DrawerTrigger>
            <DrawerContent side="left" title="Menu quản trị" hideTitle>
              <SidebarBody activeHref={activeHref} user={user} onNavigate={() => setMenuOpen(false)} />
            </DrawerContent>
          </Drawer>
          <div className="min-w-0 flex-1 truncate text-xl font-semibold font-stretch-expanded tracking-[-0.02em]">
            {title}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className={cn('flex-1 px-4 py-6 lg:px-8 lg:py-8', embedded && 'overflow-y-auto')}>
          {children}
        </main>
      </div>
    </div>
  );
}
