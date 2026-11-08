'use client';

import type { CategoryKey, FacetDTO, Paginated, ProductSummaryDTO, SpecField } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ProductCard } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { AddToCartButton } from '../cart/AddToCartButton';
import { FilterPanel } from './FilterPanel';
import { activeChips, type BrandCount, buildFilterFields } from './filters';
import {
  clearFilters,
  countActiveFilters,
  type ListingQuery,
  PAGE_SIZE,
  parseListingParams,
  queryString,
  SORT_OPTIONS,
  type SortKey,
  setPage,
  setSort,
  toApiSearch,
} from './listing-query';
import { Pagination } from './Pagination';

export interface ProductBrowserProps {
  /** Category page: the path category with its spec schema. Omit on /search. */
  category?: { key: CategoryKey; name: string; specSchema: SpecField[] };
  facets: FacetDTO[];
  brands: BrandCount[];
  /** Server-rendered first page; reused while the URL still matches `search`. */
  initial: { search: string; data: Paginated<ProductSummaryDTO> } | null;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <div key={i} className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-2.5 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductBrowser({ category, facets, brands, initial }: ProductBrowserProps) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const query = useMemo(() => parseListingParams(searchParams), [searchParams]);
  const apiSearch = toApiSearch(query, category?.key ?? query.category);
  const fields = useMemo(
    () => (category ? buildFilterFields(category.specSchema, facets) : []),
    [category, facets],
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isPending, isFetching, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: [...queryKeys.products({ category: category?.key }), apiSearch],
    queryFn: () => api<Paginated<ProductSummaryDTO>>(`/products?${apiSearch}`),
    initialData: initial?.search === apiSearch ? initial.data : undefined,
    placeholderData: keepPreviousData,
  });

  // The History API keeps filtering client-side: Next syncs useSearchParams without a server round trip.
  const navigate = useCallback(
    (next: ListingQuery, opts: { scroll?: boolean } = {}) => {
      window.history.pushState(null, '', `${pathname}${queryString(next)}`);
      if (opts.scroll) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [pathname],
  );

  const filterCount = countActiveFilters(query);
  const chips = activeChips(query, fields);
  const total = data?.total;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.pageSize || PAGE_SIZE))) : 1;
  const title = category ? category.name : query.q ? `Kết quả cho “${query.q}”` : 'Tất cả sản phẩm';

  const panel = (
    <FilterPanel
      query={query}
      onChange={(next) => navigate(next)}
      fields={fields}
      brands={brands}
      showCategory={!category}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6 lg:py-8">
      <nav aria-label="Đường dẫn" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="focus-ring rounded-xs hover:text-fg">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-fg">
            {category ? category.name : 'Tìm kiếm'}
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance text-fg">{title}</h1>
          <p className="text-sm text-muted" aria-live="polite">
            {total === undefined ? 'Đang tải sản phẩm…' : `${formatNumber(total)} sản phẩm`}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal aria-hidden />
              Bộ lọc{filterCount > 0 && ` (${filterCount})`}
            </Button>
            <DrawerContent
              title="Bộ lọc"
              description={total !== undefined ? `${formatNumber(total)} sản phẩm phù hợp` : undefined}
            >
              <DrawerBody className="grid content-start">{panel}</DrawerBody>
              <DrawerFooter>
                <Button
                  variant="ghost"
                  disabled={filterCount === 0}
                  onClick={() => navigate(clearFilters(query))}
                >
                  Xóa bộ lọc
                </Button>
                <Button className="ms-auto" onClick={() => setDrawerOpen(false)}>
                  {total !== undefined ? `Xem ${formatNumber(total)} sản phẩm` : 'Xem kết quả'}
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className="shrink-0 text-sm text-muted max-sm:sr-only">Sắp xếp</span>
            <Select
              aria-label="Sắp xếp theo"
              className="sm:w-48"
              options={SORT_OPTIONS}
              value={query.sort}
              onValueChange={(v) => navigate(setSort(query, v as SortKey))}
            />
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
          {chips.map((chip) => (
            <li key={chip.id}>
              <button
                type="button"
                onClick={() => navigate(chip.remove(query))}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong bg-surface ps-3 pe-2 text-sm text-fg transition-colors hover:bg-surface-2"
                aria-label={`Bỏ lọc ${chip.label}`}
              >
                {chip.label}
                <X className="size-3.5 text-muted" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => navigate(clearFilters(query))}
              className="focus-ring rounded-xs px-1 text-sm font-medium text-accent-ink hover:underline"
            >
              Xóa tất cả
            </button>
          </li>
        </ul>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8">
        <aside
          aria-label="Bộ lọc sản phẩm"
          className="no-scrollbar sticky top-32 hidden max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-md border border-border bg-surface p-4 lg:block"
        >
          {panel}
          {filterCount > 0 && (
            <Button variant="secondary" className="mt-2 w-full" onClick={() => navigate(clearFilters(query))}>
              Xóa bộ lọc
            </Button>
          )}
        </aside>

        <div ref={resultsRef} className="flex min-w-0 scroll-mt-32 flex-col gap-6">
          {isPending ? (
            <ProductGridSkeleton />
          ) : isError && !data ? (
            <EmptyState
              tone="error"
              icon={<SearchX />}
              title="Chưa tải được danh sách sản phẩm"
              description="Máy chủ không phản hồi. Kiểm tra mạng rồi thử lại."
              actions={<Button onClick={() => void refetch()}>Thử lại</Button>}
            />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              compact
              icon={<SearchX />}
              title="Không có sản phẩm phù hợp"
              description={
                filterCount > 0
                  ? 'Thử bỏ bớt bộ lọc hoặc nới khoảng giá.'
                  : query.q
                    ? 'Thử từ khóa ngắn hơn, ví dụ “RTX 4060” hoặc “Ryzen 5”, hoặc hỏi AI tư vấn.'
                    : 'Danh mục này đang chờ nhập hàng.'
              }
              actions={
                filterCount > 0 ? (
                  <Button onClick={() => navigate(clearFilters(query))}>Xóa bộ lọc</Button>
                ) : (
                  <Button asChild variant="workshop">
                    <Link href={query.q ? `/advisor?q=${encodeURIComponent(query.q)}` : '/advisor'}>
                      Hỏi AI tư vấn
                    </Link>
                  </Button>
                )
              }
            />
          ) : data ? (
            <div className="relative">
              {isFetching && isPlaceholderData && (
                <div className="absolute inset-x-0 -top-3 z-10 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted shadow-raised">
                    <Spinner size="sm" label={null} />
                    Đang cập nhật…
                  </span>
                </div>
              )}
              <ul
                className={cn(
                  'grid grid-cols-2 gap-3 transition-opacity sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
                  isFetching && isPlaceholderData && 'opacity-60',
                )}
                aria-busy={isFetching || undefined}
              >
                {data.items.map((p) => (
                  <li key={p.id} className="grid min-w-0">
                    <ProductCard
                      product={p}
                      action={<AddToCartButton compact product={p} className="max-sm:hidden" />}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data && (
            <Pagination
              page={query.page}
              totalPages={totalPages}
              hrefFor={(p) => `${pathname}${queryString(setPage(query, p))}`}
              onNavigate={(p) => navigate(setPage(query, p), { scroll: true })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
