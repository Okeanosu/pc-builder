import { CATEGORY_LABELS } from '@pc/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ListingSkeleton } from '@/features/catalog/ListingSkeleton';
import { parseListingParams, toApiSearch } from '@/features/catalog/listing-query';
import { ProductBrowser } from '@/features/catalog/ProductBrowser';
import {
  getCategory,
  getCategoryBrands,
  getFacets,
  getProducts,
  isCategoryKey,
} from '@/features/catalog/server';

export async function generateMetadata({ params }: PageProps<'/c/[category]'>): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryKey(category)) return { title: 'Không tìm thấy danh mục' };
  const label = CATEGORY_LABELS[category];
  return {
    title: label,
    description: `${label} chính hãng còn hàng trong kho, lọc theo thông số kỹ thuật, giá cập nhật theo tồn kho. Thanh toán VietQR.`,
  };
}

async function CategoryContent({ params, searchParams }: PageProps<'/c/[category]'>) {
  const { category } = await params;
  if (!isCategoryKey(category)) notFound();
  const query = parseListingParams(await searchParams);
  const search = toApiSearch(query, category);
  // Each piece degrades on its own: the client refetches the listing, filters simply hide.
  const [meta, facets, brands, products] = await Promise.all([
    getCategory(category).catch(() => null),
    getFacets(category).catch(() => []),
    getCategoryBrands(category).catch(() => []),
    getProducts(search).catch(() => null),
  ]);
  return (
    <ProductBrowser
      category={{
        key: category,
        name: meta?.name ?? CATEGORY_LABELS[category],
        specSchema: meta?.specSchema ?? [],
      }}
      facets={facets}
      brands={brands}
      initial={products ? { search, data: products } : null}
    />
  );
}

export default function CategoryPage(props: PageProps<'/c/[category]'>) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
