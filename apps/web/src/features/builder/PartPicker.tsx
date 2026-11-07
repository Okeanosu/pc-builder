'use client';

import type {
  CategoryKey,
  FacetDTO,
  Paginated,
  ProductDTO,
  ProductQuery,
  ProductSummaryDTO,
} from '@pc/shared';
import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { Check, OctagonX, PackageSearch, Search, TriangleExclamationPoint, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatSpecValue } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { type BuilderContext, type BuilderParts, type CandidateVerdict, previewCandidate } from './compat';
import { categoryInSentence } from './labels';
import { type PickerFilters, pickerSearchParams, toggleFacetValue } from './picker-query';

const SORT_OPTIONS: { value: ProductQuery['sort']; label: string }[] = [
  { value: 'performance', label: 'Hiệu năng cao trước' },
  { value: 'price_asc', label: 'Giá thấp trước' },
  { value: 'price_desc', label: 'Giá cao trước' },
  { value: 'newest', label: 'Mới nhất' },
];

const MAX_FACETS = 3;
const MAX_FACET_VALUES = 8;
const DETAIL_STALE_MS = 5 * 60_000;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function VerdictLine({ verdict, loading }: { verdict?: CandidateVerdict; loading: boolean }) {
  if (loading || !verdict) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Spinner size="sm" label={null} />
        Đang kiểm tra tương thích…
      </span>
    );
  }
  const first = verdict.issues[0];
  return (
    <span className="flex flex-col gap-1">
      {verdict.status === 'ok' ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok-ink">
          <Check className="size-3.5" aria-hidden />
          Tương thích với cấu hình hiện tại
        </span>
      ) : (
        first && (
          <span
            className={cn(
              'flex items-start gap-1.5 text-xs font-medium',
              first.severity === 'error' ? 'text-danger-ink' : 'text-warn-ink',
            )}
          >
            {first.severity === 'error' ? (
              <OctagonX className="mt-px size-3.5 shrink-0" aria-hidden />
            ) : (
              <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              <span className="font-mono">{first.code}</span> {first.message}
              {verdict.issues.length > 1 && ` (+${verdict.issues.length - 1})`}
            </span>
          </span>
        )
      )}
      {verdict.overBudget && (
        <span className="inline-flex items-center gap-1.5 text-xs text-warn-ink">
          <Wallet className="size-3.5" aria-hidden />
          Chọn món này sẽ vượt ngân sách
        </span>
      )}
    </span>
  );
}

interface PartPickerProps {
  category: CategoryKey | null;
  parts: BuilderParts;
  context: BuilderContext;
  onOpenChange: (open: boolean) => void;
  onChoose: (product: ProductDTO) => void;
  onRemove: (category: CategoryKey) => void;
}

export function PartPicker({ category, ...rest }: PartPickerProps) {
  return (
    <Drawer open={category !== null} onOpenChange={rest.onOpenChange}>
      {category && <PickerContent key={category} category={category} {...rest} />}
    </Drawer>
  );
}

function PickerContent({
  category,
  parts,
  context,
  onChoose,
  onRemove,
}: Omit<PartPickerProps, 'category' | 'onOpenChange'> & { category: CategoryKey }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<ProductQuery['sort']>('performance');
  const [specs, setSpecs] = useState<Record<string, string[]>>({});
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const debouncedQ = useDebounced(q, 300);
  const current = parts[category];
  const noun = categoryInSentence(category);

  const facets = useQuery({
    queryKey: queryKeys.facets(category),
    queryFn: () => api<FacetDTO[]>(`/categories/${category}/facets`),
    staleTime: 5 * 60_000,
  });
  const keyFacets = useMemo(
    () =>
      (facets.data ?? [])
        .filter((f) => f.type !== 'number' && f.values.length > 1 && f.values.length <= MAX_FACET_VALUES)
        .slice(0, MAX_FACETS),
    [facets.data],
  );

  const filters: PickerFilters = { category, q: debouncedQ, sort, specs };
  const list = useInfiniteQuery({
    queryKey: [...queryKeys.products({ category, q: debouncedQ, sort, specs }), 'picker'],
    queryFn: ({ pageParam }) =>
      api<Paginated<ProductSummaryDTO>>(`/products?${pickerSearchParams(filters, pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  // Summaries carry no full specs, so each visible item is checked against its full record.
  const details = useQueries({
    queries: items.map((p) => ({
      queryKey: queryKeys.product(p.id),
      queryFn: () => api<ProductDTO>(`/products/${p.id}`),
      staleTime: DETAIL_STALE_MS,
    })),
  });
  const verdicts = new Map<string, CandidateVerdict>();
  details.forEach((d, i) => {
    const item = items[i];
    if (item && d.data) verdicts.set(item.id, previewCandidate(parts, d.data, context));
  });
  const checked = verdicts.size;
  const compatible = [...verdicts.values()].filter((v) => v.status !== 'error').length;
  const visible = onlyCompatible ? items.filter((p) => verdicts.get(p.id)?.status !== 'error') : items;

  const description = list.isPending
    ? 'Đang tải sản phẩm còn hàng…'
    : `${total} sản phẩm còn hàng${checked > 0 ? ` · ${compatible}/${checked} đã kiểm tra tương thích` : ''}`;

  return (
    <DrawerContent
      title={`Chọn ${noun}`}
      description={description}
      className="sm:w-[min(560px,100vw)]"
      onOpenAutoFocus={(e) => {
        // On touch screens focusing the search box would open the keyboard over the list.
        if (window.matchMedia('(pointer: coarse)').matches) e.preventDefault();
      }}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-3">
        <div className="flex gap-2">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lọc theo tên, mã, chipset…"
            aria-label={`Tìm ${noun}`}
            leading={<Search aria-hidden />}
            wrapperClassName="flex-1"
          />
          <Select
            aria-label="Sắp xếp"
            value={sort}
            onValueChange={(v) => setSort(v as ProductQuery['sort'])}
            options={SORT_OPTIONS}
            className="w-40 max-sm:w-32"
          />
        </div>
        {keyFacets.map((f) => (
          <div key={f.key} className="flex min-w-0 items-center gap-2">
            <span className="w-20 shrink-0 truncate text-xs text-muted">{f.label}</span>
            <ul className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto" aria-label={f.label}>
              {f.values.map((v) => {
                const on = specs[f.key]?.includes(v.value) ?? false;
                return (
                  <li key={v.value} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSpecs((s) => toggleFacetValue(s, f.key, v.value))}
                      className={cn(
                        'focus-ring inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors',
                        on
                          ? 'border-accent bg-accent/15 font-semibold text-accent-ink'
                          : 'border-border-strong text-fg hover:bg-surface-2',
                      )}
                    >
                      {formatSpecValue(f.type === 'boolean' ? v.value === 'true' : v.value, { key: f.key }) ??
                        v.value}
                      <span className="font-mono text-muted tabular-nums">{v.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Checkbox
          checked={onlyCompatible}
          onCheckedChange={(v) => setOnlyCompatible(v === true)}
          label="Ẩn linh kiện không tương thích"
        />
      </div>

      <DrawerBody className="grid content-start gap-3">
        {list.isPending ? (
          Array.from({ length: 4 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))
        ) : list.isError ? (
          <EmptyState
            compact
            tone="error"
            icon={<PackageSearch />}
            title="Không tải được danh sách"
            description="Kiểm tra kết nối rồi thử lại."
            actions={
              <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageSearch />}
            title={items.length === 0 ? 'Không có sản phẩm phù hợp' : 'Trang này chưa có món tương thích'}
            description={
              items.length === 0
                ? 'Bỏ bớt bộ lọc hoặc thử từ khóa khác.'
                : 'Tải thêm sản phẩm hoặc bỏ chọn "Ẩn linh kiện không tương thích".'
            }
            actions={
              Object.keys(specs).length > 0 || q ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSpecs({});
                    setQ('');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          visible.map((p) => {
            const verdict = verdicts.get(p.id);
            const detail = details[items.indexOf(p)]?.data;
            const isCurrent = current?.id === p.id;
            const incompatible = verdict?.status === 'error';
            return (
              <div key={p.id} className="flex flex-col gap-1.5">
                <ProductCard
                  product={p}
                  variant="list"
                  maxSpecs={3}
                  className={cn(
                    incompatible && 'opacity-55 hover:opacity-90',
                    isCurrent && 'border-accent shadow-[0_0_0_1px_var(--color-accent)]',
                  )}
                  action={
                    isCurrent ? (
                      <Button size="sm" variant="ghost" disabled>
                        <Check aria-hidden />
                        Đang dùng
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={incompatible ? 'outline' : 'primary'}
                        disabled={!detail}
                        onClick={() => detail && onChoose(detail)}
                        aria-label={`Chọn ${p.name}${incompatible ? ' (không tương thích)' : ''}`}
                      >
                        Chọn
                      </Button>
                    )
                  }
                />
                <div className="px-1">
                  <VerdictLine verdict={verdict} loading={!detail} />
                </div>
              </div>
            );
          })
        )}
        {list.hasNextPage && (
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
            className="justify-self-center"
          >
            Xem thêm sản phẩm
          </Button>
        )}
      </DrawerBody>

      <DrawerFooter className="justify-between">
        <span className="text-xs text-muted">Giá và tồn kho cập nhật theo kho cửa hàng</span>
        {current && (
          <Button size="sm" variant="ghost" onClick={() => onRemove(category)}>
            Bỏ chọn {noun}
          </Button>
        )}
      </DrawerFooter>
    </DrawerContent>
  );
}
