// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { AdminPageHeader } from './AdminChrome';
import { AdminLayoutClient } from './AdminLayoutClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/weights',
}));
vi.mock('next/link', () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

afterEach(cleanup);

describe('AdminPageHeader', () => {
  it("renders the page title as the admin page's only level-1 heading", async () => {
    useAuthStore.setState({
      status: 'ready',
      user: { id: 'u1', email: 'admin@pcbuilder.vn', fullName: 'Quản trị viên', phone: null, role: 'ADMIN' },
    });
    render(
      <AdminLayoutClient>
        <AdminPageHeader title="Trọng số thuật toán" />
        <p>Nội dung trang</p>
      </AdminLayoutClient>,
    );
    const title = await within(screen.getByRole('banner')).findByText('Trọng số thuật toán');
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toBe(title);
  });
});
