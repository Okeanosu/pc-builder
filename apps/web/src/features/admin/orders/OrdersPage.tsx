'use client';

import { ORDER_STATUSES, ORDER_TYPES } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { OrderStatusBadge, OrderTypeBadge, PaymentStatusBadge } from '../badges';
import { formatDateTime, ORDER_TYPE_LABEL, orderStatusLabel } from '../format';
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

export function OrdersPage() {
  const { get, set, page } = useListParams();
  const status = pickEnum(get('status'), ORDER_STATUSES);
  const type = pickEnum(get('type'), ORDER_TYPES);
  const q = get('q');
  const filter = { page, pageSize: PAGE_SIZE, status, type, q: q || undefined };
  const query = useQuery({
    queryKey: queryKeys.admin.orders(filter),
    queryFn: () => adminApi.orders(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  useClampPage(page, query.isPlaceholderData ? undefined : query.data?.total, PAGE_SIZE, set);
  const filtered = Boolean(status || type || q);
  const clear = () => set({ status: null, type: null, q: null });

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Đơn hàng" />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox
          value={q}
          onSearch={(v) => set({ q: v })}
          placeholder="Mã đơn, số điện thoại hoặc tên"
          aria-label="Tìm đơn hàng"
          className="sm:w-80"
        />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Select
            aria-label="Lọc theo trạng thái"
            value={status ?? ALL}
            onValueChange={(v) => set({ status: v === ALL ? null : v })}
            options={[
              { value: ALL, label: 'Mọi trạng thái' },
              ...ORDER_STATUSES.map((s) => ({ value: s, label: orderStatusLabel(s) })),
            ]}
            className="sm:w-48"
          />
          <Select
            aria-label="Lọc theo loại đơn"
            value={type ?? ALL}
            onValueChange={(v) => set({ type: v === ALL ? null : v })}
            options={[
              { value: ALL, label: 'Mọi loại đơn' },
              ...ORDER_TYPES.map((t) => ({ value: t, label: ORDER_TYPE_LABEL[t] })),
            ]}
            className="sm:w-40"
          />
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <TableFrame className={refetchClass(query.isFetching && !query.isRefetching, Boolean(query.data))}>
        {query.isPending ? (
          <TableSkeleton cols={6} />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={<Receipt />}
            title={filtered ? 'Không có đơn phù hợp' : 'Chưa có đơn hàng'}
            description={
              filtered
                ? 'Thử tìm bằng mã đơn đầy đủ (ví dụ PCB…) hoặc bỏ bớt bộ lọc.'
                : 'Đơn sẽ hiện ở đây ngay khi khách đặt hàng trên cửa hàng.'
            }
            actions={
              filtered && (
                <Button variant="secondary" size="sm" onClick={clear}>
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Mã đơn</th>
                <th className={th}>Khách hàng</th>
                <th className={th}>Trạng thái</th>
                <th className={th}>Thanh toán</th>
                <th className={thEnd}>Tổng tiền</th>
                <th className={th}>Đặt lúc</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2">
                  <td className={td}>
                    <Link
                      href={`/admin/orders/${o.code}`}
                      className="focus-ring rounded-xs font-mono font-medium text-accent-ink hover:underline"
                    >
                      {o.code}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <OrderTypeBadge type={o.type} />
                      <span>{o.items.reduce((n, i) => n + i.qty, 0)} sản phẩm</span>
                    </div>
                  </td>
                  <td className={cn(td, 'min-w-44')}>
                    <div className="font-medium">{o.shippingName}</div>
                    <div className="font-mono text-xs text-muted">{o.phone}</div>
                  </td>
                  <td className={td}>
                    <OrderStatusBadge status={o.status} type={o.type} />
                  </td>
                  <td className={td}>
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className={cn(td, 'text-end')}>
                    <Price amount={o.total} size="sm" />
                  </td>
                  <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDateTime(o.createdAt)}</td>
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
