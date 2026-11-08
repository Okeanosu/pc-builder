'use client';

import { CATEGORY_KEYS, CATEGORY_LABELS, PRODUCT_STATUSES } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PackageOpen, Pencil, Plus, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { PriceTag } from '@/components/domain/PriceTag';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { ProductStatusBadge } from '../badges';
import { formatWeight } from '../format';
import {
  Pagination,
  QueryError,
  refetchClass,
  SearchBox,
  TableFrame,
  TableSkeleton,
  tableClass,
  td,
  th,
  thEnd,
} from '../ui';
import { pickEnum, useClampPage, useListParams } from '../use-list-params';

const PAGE_SIZE = 20;
const ALL = 'all';

export function ProductsListPage() {
  const { get, set, page } = useListParams();
  const category = pickEnum(get('category'), CATEGORY_KEYS);
  const status = pickEnum(get('status'), PRODUCT_STATUSES);
  const q = get('q');
  const filter = { page, pageSize: PAGE_SIZE, category, status, q: q || undefined };
  const query = useQuery({
    queryKey: queryKeys.admin.products(filter),
    queryFn: () => adminApi.products(filter),
    placeholderData: keepPreviousData,
  });
  useClampPage(page, query.isPlaceholderData ? undefined : query.data?.total, PAGE_SIZE, set);
  const filtered = Boolean(category || status || q);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Sản phẩm"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products/schema" aria-label="Lược đồ thông số">
                <Settings2 aria-hidden />
                <span className="max-md:sr-only">Lược đồ thông số</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link
                href={`/admin/products/new${category ? `?category=${category}` : ''}`}
                aria-label="Thêm sản phẩm"
              >
                <Plus aria-hidden />
                <span className="max-sm:sr-only">Thêm sản phẩm</span>
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox
          value={q}
          onSearch={(v) => set({ q: v })}
          placeholder="Tìm theo tên hoặc SKU"
          aria-label="Tìm sản phẩm"
          className="sm:w-72"
        />
        <div className="grid grid-cols-2 gap-3 sm:flex">
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
          <Select
            aria-label="Lọc theo trạng thái"
            value={status ?? ALL}
            onValueChange={(v) => set({ status: v === ALL ? null : v })}
            options={[
              { value: ALL, label: 'Mọi trạng thái' },
              { value: 'ACTIVE', label: 'Đang bán' },
              { value: 'HIDDEN', label: 'Đã ẩn' },
            ]}
            className="sm:w-40"
          />
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => set({ q: null, category: null, status: null })}>
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <TableFrame className={refetchClass(query.isFetching, Boolean(query.data))}>
        {query.isPending ? (
          <TableSkeleton cols={6} />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageOpen />}
            title={filtered ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm'}
            description={
              filtered
                ? 'Thử bỏ bớt bộ lọc hoặc tìm bằng SKU.'
                : 'Thêm sản phẩm đầu tiên để cửa hàng có hàng bán.'
            }
            actions={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ q: null, category: null, status: null })}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/admin/products/new">Thêm sản phẩm</Link>
                </Button>
              )
            }
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Sản phẩm</th>
                <th className={th}>Danh mục</th>
                <th className={th}>Trạng thái</th>
                <th className={thEnd}>Có thể bán</th>
                <th className={thEnd}>Giá</th>
                <th className={thEnd}>Ưu tiên</th>
                <th className={th}>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className={cn(td, 'min-w-64')}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="focus-ring line-clamp-2 rounded-xs font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted">
                      <span className="tabular-nums">{p.sku}</span> · {p.brand}
                    </div>
                  </td>
                  <td className={cn(td, 'whitespace-nowrap')}>{CATEGORY_LABELS[p.category]}</td>
                  <td className={td}>
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td className={cn(td, 'text-end')}>
                    <span
                      className={cn(
                        ' tabular-nums',
                        p.stock <= 0 ? 'text-danger-ink' : p.stock <= 3 ? 'text-warn-ink' : 'text-fg',
                      )}
                    >
                      {p.stock}
                    </span>
                    <div className="text-xs whitespace-nowrap text-muted">
                      kho <span className="tabular-nums">{p.stockOnHand}</span>
                      {p.reserved > 0 && (
                        <>
                          {' '}
                          · giữ <span className="tabular-nums">{p.reserved}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={cn(td, 'text-end')}>
                    <PriceTag price={p.price} salePrice={p.salePrice} size="sm" className="items-end" />
                  </td>
                  <td
                    className={cn(
                      td,
                      'text-end tabular-nums',
                      p.commercialBoost > 0 ? 'text-fg' : 'text-muted',
                    )}
                  >
                    {formatWeight(p.commercialBoost)}
                  </td>
                  <td className={cn(td, 'text-end')}>
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/products/${p.id}`} aria-label={`Sửa ${p.name}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableFrame>
      {query.data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data.total}
          onPage={(p) => set({ page: p })}
        />
      )}
    </div>
  );
}
