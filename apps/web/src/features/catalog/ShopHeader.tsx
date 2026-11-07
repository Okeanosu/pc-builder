'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { type NavCategory, SiteHeader } from '@/components/layout/SiteHeader';
import { AccountMenu } from '../auth/AccountMenu';
import { useCart } from '../cart/hooks';

const ACCOUNT_PLACEHOLDER = <span className="inline-block size-10 lg:w-28" aria-hidden />;

function LiveHeader({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const { data: cart } = useCart();
  const activeCategory = /^\/c\/([^/?#]+)/.exec(pathname)?.[1];
  const q = pathname === '/search' ? (searchParams.get('q') ?? undefined) : undefined;
  return (
    <SiteHeader
      key={q ?? ''}
      categories={categories}
      activeCategory={activeCategory}
      cartCount={cart?.itemCount ?? 0}
      accountSlot={<AccountMenu />}
      searchDefaultValue={q}
    />
  );
}

/** SiteHeader wired to the cart, the signed-in user and the current route. */
export function ShopHeader({ categories }: { categories: NavCategory[] }) {
  // usePathname/useSearchParams read the URL, which is unknown while prerendering dynamic routes.
  return (
    <Suspense fallback={<SiteHeader categories={categories} accountSlot={ACCOUNT_PLACEHOLDER} />}>
      <LiveHeader categories={categories} />
    </Suspense>
  );
}
