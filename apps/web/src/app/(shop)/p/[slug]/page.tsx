import { CATEGORY_LABELS, type ProductDTO } from '@pc/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

// Resolved before any Suspense so HTML-only crawlers get a real 404 (needs `instant = false` to block).
// Browsers still get 200 + noindex: Next 16 PPR flushes the static layout shell before the page can throw.
export const instant = false;

export default async function ProductPage({ params }: PageProps<'/p/[slug]'>) {
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
