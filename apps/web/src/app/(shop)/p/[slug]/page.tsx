import { CATEGORY_LABELS, type ProductDTO } from '@pc/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { ProductDetail } from '@/features/catalog/ProductDetail';
import { getBenchmarkReference, getCategory, getProduct } from '@/features/catalog/server';
import { formatVnd } from '@/lib/format';

const effectivePrice = (p: ProductDTO) => p.salePrice ?? p.price;

export async function generateMetadata({ params }: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: 'Không tìm thấy sản phẩm' };
  const description =
    product.description ??
    `${product.name} (${CATEGORY_LABELS[product.category]}) giá ${formatVnd(effectivePrice(product))}, còn ${product.stock} sản phẩm.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

function productJsonLd(p: ProductDTO) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    brand: { '@type': 'Brand', name: p.brand },
    category: CATEGORY_LABELS[p.category],
    description: p.description ?? undefined,
    image: p.images.length > 0 ? p.images : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'VND',
      price: effectivePrice(p),
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
}

async function ProductContent({ params }: Pick<PageProps<'/p/[slug]'>, 'params'>) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [category, reference] = await Promise.all([
    getCategory(product.category).catch(() => null),
    getBenchmarkReference(product.category).catch(() => null),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from our own API data; `<` is escaped below
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c') }}
      />
      <ProductDetail
        product={product}
        categoryName={category?.name ?? CATEGORY_LABELS[product.category]}
        specSchema={category?.specSchema ?? []}
        benchmarkReference={reference}
      />
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-8" aria-busy>
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-[4/3] w-full rounded-md" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-44" />
          </div>
          <SkeletonText lines={3} className="pt-4" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<'/p/[slug]'>) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}
