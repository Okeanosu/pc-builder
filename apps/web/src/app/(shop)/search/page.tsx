import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingSkeleton } from '@/features/catalog/ListingSkeleton';
import { parseListingParams, toApiSearch } from '@/features/catalog/listing-query';
import { ProductBrowser } from '@/features/catalog/ProductBrowser';
import { getProducts } from '@/features/catalog/server';

export const metadata: Metadata = {
  title: 'Tìm kiếm sản phẩm',
  robots: { index: false, follow: true },
};

async function SearchContent({ searchParams }: PageProps<'/search'>) {
  const query = parseListingParams(await searchParams);
  const search = toApiSearch(query, query.category);
  const products = await getProducts(search).catch(() => null);
  return <ProductBrowser facets={[]} brands={[]} initial={products ? { search, data: products } : null} />;
}

export default function SearchPage(props: PageProps<'/search'>) {
  return (
    <Suspense fallback={<ListingSkeleton title="Tìm kiếm" />}>
      <SearchContent {...props} />
    </Suspense>
  );
}
