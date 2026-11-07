import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ShopHeader } from '@/features/catalog/ShopHeader';
import { getNavCategories } from '@/features/catalog/server';

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const categories = await getNavCategories();
  return (
    <>
      <ShopHeader categories={categories} />
      <main id="noi-dung" className="flex flex-1 flex-col">
        {children}
      </main>
      {/* ChatWidget mounts here */}
      <SiteFooter categories={categories} />
    </>
  );
}
