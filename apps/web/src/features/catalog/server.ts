import {
  type Benchmark,
  type BuildDTO,
  CATEGORY_KEYS,
  type CategoryDTO,
  type CategoryKey,
  type FacetDTO,
  type Paginated,
  type ProductDTO,
  type ProductSummaryDTO,
} from '@pc/shared';
import { cacheLife } from 'next/cache';
import { DEFAULT_NAV_CATEGORIES, type NavCategory } from '@/components/layout/SiteHeader';
import { API_URL } from '@/lib/api';
import type { BrandCount } from './filters';

/** Server-to-server base URL; inside Docker the API is not reachable through the browser's hostname. */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;

export const isCategoryKey = (s: string): s is CategoryKey =>
  (CATEGORY_KEYS as readonly string[]).includes(s);

/** GET from the API on the server; null on 404, throws on anything else so errors are never cached. */
async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${SERVER_API_URL}${path}`, { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on GET ${path}`);
  return (await res.json()) as T;
}

export async function getCategories(): Promise<CategoryDTO[]> {
  'use cache';
  cacheLife('hours');
  return (await getJson<CategoryDTO[]>('/categories')) ?? [];
}

export async function getCategory(key: CategoryKey): Promise<CategoryDTO | null> {
  return (await getCategories()).find((c) => c.key === key) ?? null;
}

/** Header/footer categories. Falls back to the built-in list so the shell renders even when the API is down at build time. */
export async function getNavCategories(): Promise<NavCategory[]> {
  'use cache';
  cacheLife('hours');
  try {
    const categories = await getJson<CategoryDTO[]>('/categories');
    if (!categories?.length) return DEFAULT_NAV_CATEGORIES;
    return categories.map((c) => ({ key: c.key, label: c.name, href: `/c/${c.key}` }));
  } catch {
    return DEFAULT_NAV_CATEGORIES;
  }
}

export async function getFacets(category: CategoryKey): Promise<FacetDTO[]> {
  'use cache';
  cacheLife('minutes');
  return (await getJson<FacetDTO[]>(`/categories/${category}/facets`)) ?? [];
}

/** The products API has no brand facet, so brands are counted from the category's listing (≤ 120 products). */
export async function getCategoryBrands(category: CategoryKey): Promise<BrandCount[]> {
  'use cache';
  cacheLife('minutes');
  const counts = new Map<string, number>();
  for (let page = 1; page <= 2; page++) {
    const res = await getJson<Paginated<ProductSummaryDTO>>(
      `/products?category=${category}&pageSize=60&page=${page}&sort=name`,
    );
    for (const p of res?.items ?? []) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    if (!res || res.page * res.pageSize >= res.total) break;
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Uncached: listings show live stock. Call inside a Suspense boundary. */
export function getProducts(search: string): Promise<Paginated<ProductSummaryDTO> | null> {
  return getJson<Paginated<ProductSummaryDTO>>(`/products?${search}`);
}

export async function getProduct(slug: string): Promise<ProductDTO | null> {
  'use cache';
  cacheLife('minutes');
  return getJson<ProductDTO>(`/products/${encodeURIComponent(slug)}`);
}

export async function getBuild(id: string): Promise<BuildDTO | null> {
  'use cache';
  cacheLife('minutes');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getJson<BuildDTO>(`/builds/${id}`);
}

/** Benchmarks of the store's strongest part in the category, used as the 100% mark on product pages. */
export async function getBenchmarkReference(category: CategoryKey): Promise<Benchmark | null> {
  'use cache';
  cacheLife('hours');
  if (category !== 'cpu' && category !== 'gpu') return null;
  const top = await getJson<Paginated<ProductSummaryDTO>>(
    `/products?category=${category}&sort=performance&pageSize=1`,
  );
  const first = top?.items[0];
  if (!first) return null;
  return (await getJson<ProductDTO>(`/products/${first.slug}`))?.benchmark ?? null;
}

/** One in-stock flagship per category for the home page. */
export async function getFeaturedProducts(): Promise<ProductSummaryDTO[]> {
  'use cache';
  cacheLife('minutes');
  const pages = await Promise.all(
    CATEGORY_KEYS.map((key) =>
      getJson<Paginated<ProductSummaryDTO>>(
        `/products?category=${key}&inStock=true&sort=performance&pageSize=1`,
      ),
    ),
  );
  return pages.flatMap((p) => (p?.items[0] ? [p.items[0]] : []));
}
