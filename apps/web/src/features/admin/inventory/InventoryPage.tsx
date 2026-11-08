'use client';

import { type AdminProductDTO, CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CircleCheck, PackagePlus, ScrollText, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { StatusText } from '../badges';
import {
  Pagination,
  QueryError,
  refetchClass,
  SearchBox,
  SectionTitle,
  TableFrame,
  TableSkeleton,
  tableClass,
  td,
  th,
  thEnd,
} from '../ui';
import { pickEnum, useClampPage, useListParams } from '../use-list-params';
import { AdjustStockDialog } from './AdjustStockDialog';
import { MovementsDrawer } from './MovementsDrawer';
import { LOW_STOCK, stockLevel } from './stock';

const PAGE_SIZE = 20;
const ALL = 'all';
const LIVE_MS = 15_000;

function LevelBadge({ sellable }: { sellable: number }) {
  const level = stockLevel(sellable);
  if (level === 'out') return <StatusText tone="danger">Hết hàng</StatusText>;
  if (level === 'low') return <StatusText tone="warn">Sắp hết</StatusText>;
  return <StatusText tone="ok">Còn hàng</StatusText>;
}

function StockTable({
  items,
  onAdjust,
  onHistory,
}: {
  items: AdminProductDTO[];
  onAdjust: (p: AdminProductDTO) => void;
  onHistory: (p: AdminProductDTO) => void;
}) {
  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th className={th}>Sản phẩm</th>
          <th className={th}>Danh mục</th>
          <th className={thEnd}>Trong kho</th>
          <th className={thEnd}>Đang giữ</th>
          <th className={thEnd}>Có thể bán</th>
          <th className={th}>Mức tồn</th>
          <th className={th}>
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id} className="hover:bg-surface-2">
            <td className={cn(td, 'min-w-60')}>
              <Link
                href={`/admin/products/${p.id}`}
                className="focus-ring line-clamp-2 rounded-xs font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
              >
                {p.name}
              </Link>
              <div className="mt-0.5 text-xs text-muted">{p.sku}</div>
            </td>
            <td className={cn(td, 'whitespace-nowrap')}>{CATEGORY_LABELS[p.category]}</td>
            <td className={cn(td, 'text-end tabular-nums')}>{p.stockOnHand}</td>
            <td className={cn(td, 'text-end tabular-nums', p.reserved > 0 ? 'text-fg' : 'text-muted')}>
              {p.reserved}
            </td>
            <td className={cn(td, 'text-end font-semibold tabular-nums')}>{p.stock}</td>
            <td className={td}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <LevelBadge sellable={p.stock} />
                {p.status === 'HIDDEN' && <StatusText tone="neutral">Đã ẩn</StatusText>}
              </div>
            </td>
            <td className={cn(td, 'text-end')}>
              <div className="flex justify-end gap-1">
                <Button variant="secondary" size="sm" onClick={() => onAdjust(p)}>
                  <PackagePlus aria-hidden />
                  <span className="max-lg:sr-only">Điều chỉnh</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onHistory(p)}
                  aria-label={`Lịch sử kho ${p.name}`}
                >
                  <ScrollText aria-hidden />
                  <span className="max-lg:sr-only">Lịch sử</span>
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InventoryPage() {
  const { get, set, page } = useListParams();
  const category = pickEnum(get('category'), CATEGORY_KEYS);
  const q = get('q');
  const [adjusting, setAdjusting] = useState<AdminProductDTO | null>(null);
  const [history, setHistory] = useState<AdminProductDTO | null>(null);

  const low = useQuery({
    queryKey: queryKeys.admin.products({ lowStock: true, pageSize: 100 }),
    queryFn: () => adminApi.products({ lowStock: true, pageSize: 100 }),
    refetchInterval: LIVE_MS,
  });
  const lowItems = [...(low.data?.items ?? [])].sort(
    (a, b) => a.stock - b.stock || a.name.localeCompare(b.name),
  );

  const filter = { page, pageSize: PAGE_SIZE, category, q: q || undefined };
  const all = useQuery({
    queryKey: queryKeys.admin.products(filter),
    queryFn: () => adminApi.products(filter),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_MS,
  });
  useClampPage(page, all.isPlaceholderData ? undefined : all.data?.total, PAGE_SIZE, set);
  const filtered = Boolean(category || q);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Tồn kho" />
      <p className="-mb-4 text-sm text-muted">
        Số liệu tự cập nhật mỗi {LIVE_MS / 1000} giây. “Đang giữ” là hàng của đơn chờ thanh toán (giữ 15
        phút); “Có thể bán” = trong kho − đang giữ.
      </p>

      <section className="flex flex-col gap-3" aria-labelledby="low-stock-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle id="low-stock-title">Cần nhập thêm (còn bán được ≤ {LOW_STOCK})</SectionTitle>
          {low.data && <span className="text-sm text-muted">{low.data.total} sản phẩm đang bán</span>}
        </div>
        <TableFrame>
          {low.isPending ? (
            <TableSkeleton rows={3} cols={6} />
          ) : low.isError ? (
            <QueryError error={low.error} onRetry={() => low.refetch()} />
          ) : lowItems.length === 0 ? (
            <EmptyState
              compact
              icon={<CircleCheck />}
              title="Không có sản phẩm sắp hết"
              description={`Mọi sản phẩm đang bán đều còn hơn ${LOW_STOCK} chiếc có thể bán.`}
            />
          ) : (
            <StockTable items={lowItems} onAdjust={setAdjusting} onHistory={setHistory} />
          )}
        </TableFrame>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="all-stock-title">
        <SectionTitle id="all-stock-title">Toàn bộ tồn kho</SectionTitle>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox
            value={q}
            onSearch={(v) => set({ q: v })}
            placeholder="Tìm theo tên hoặc SKU"
            aria-label="Tìm sản phẩm trong kho"
            className="sm:w-72"
          />
          <Select
            aria-label="Lọc theo danh mục"
            value={category ?? ALL}
            onValueChange={(v) => set({ category: v === ALL ? null : v })}
            options={[
              { value: ALL, label: 'Mọi danh mục' },
              ...CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORY_LABELS[k] })),
            ]}
            className="sm:w-44"
          />
        </div>
        <TableFrame className={refetchClass(all.isFetching && !all.isRefetching, Boolean(all.data))}>
          {all.isPending ? (
            <TableSkeleton cols={6} />
          ) : all.isError ? (
            <QueryError error={all.error} onRetry={() => all.refetch()} />
          ) : all.data.items.length === 0 ? (
            <EmptyState
              compact
              icon={<Warehouse />}
              title={filtered ? 'Không có sản phẩm phù hợp' : 'Kho đang trống'}
              description={
                filtered
                  ? 'Thử tìm bằng SKU hoặc bỏ lọc danh mục.'
                  : 'Thêm sản phẩm để bắt đầu quản lý tồn kho.'
              }
              actions={
                filtered && (
                  <Button variant="secondary" size="sm" onClick={() => set({ q: null, category: null })}>
                    Xóa bộ lọc
                  </Button>
                )
              }
            />
          ) : (
            <StockTable items={all.data.items} onAdjust={setAdjusting} onHistory={setHistory} />
          )}
        </TableFrame>
        {all.data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={all.data.total}
            onPage={(p) => set({ page: p })}
          />
        )}
      </section>

      <AdjustStockDialog product={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />
      <MovementsDrawer product={history} onOpenChange={(open) => !open && setHistory(null)} />
    </div>
  );
}
