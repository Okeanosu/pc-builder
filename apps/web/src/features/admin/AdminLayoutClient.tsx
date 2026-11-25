'use client';

import type { UserDTO } from '@pc/shared';
import { LogOut, ShieldExclamationPoint } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';
import { AdminChromeProvider } from './AdminChrome';

const ROLE_LABEL: Record<UserDTO['role'], string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
};

function loginHref(): string {
  const back = `${window.location.pathname}${window.location.search}`;
  return `/login?redirect=${encodeURIComponent(back || '/admin')}`;
}

function UserCard({ user, onLogout }: { user: UserDTO; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-fg">{user.fullName}</span>
        <span className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</span>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Đăng xuất">
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}

function CenteredScreen({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-bg px-4">{children}</div>;
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const [titleEl, setTitleEl] = useState<HTMLElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null);
  const resolved = status === 'ready';

  useEffect(() => {
    if (resolved && !user) router.replace(loginHref());
  }, [resolved, user, router]);

  const role = user?.role ?? 'STAFF';
  const chrome = useMemo(() => ({ titleEl, actionsEl, role }), [titleEl, actionsEl, role]);

  const signOut = async () => {
    await logout();
    router.replace('/login?redirect=%2Fadmin');
  };

  if (!resolved || !user) {
    return (
      <CenteredScreen>
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner size="md" label={null} />
          <span role="status">
            {resolved ? 'Đang chuyển tới trang đăng nhập…' : 'Đang kiểm tra phiên đăng nhập…'}
          </span>
        </div>
      </CenteredScreen>
    );
  }

  if (user.role === 'CUSTOMER') {
    return (
      <CenteredScreen>
        <div className="w-full max-w-md">
          <EmptyState
            tone="error"
            icon={<ShieldExclamationPoint />}
            title="Khu vực dành cho nhân viên cửa hàng"
            description={`Tài khoản ${user.email} là tài khoản khách hàng nên không mở được trang quản trị (lỗi 403). Đăng nhập bằng tài khoản nhân viên hoặc quản trị viên để tiếp tục.`}
            actions={
              <>
                <Button asChild variant="secondary">
                  <Link href="/">Về cửa hàng</Link>
                </Button>
                <Button onClick={signOut}>Đăng nhập tài khoản khác</Button>
              </>
            }
          />
        </div>
      </CenteredScreen>
    );
  }

  return (
    <AdminChromeProvider value={chrome}>
      <AdminShell
        title={<div ref={setTitleEl} />}
        actions={<div ref={setActionsEl} className="flex items-center gap-2" />}
        user={<UserCard user={user} onLogout={signOut} />}
      >
        {children}
      </AdminShell>
    </AdminChromeProvider>
  );
}
