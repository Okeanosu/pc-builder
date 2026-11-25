'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { StatusText } from '../badges';
import { formatDateTime } from '../format';
import {
  Pagination,
  QueryError,
  refetchClass,
  TableFrame,
  TableSkeleton,
  tableClass,
  td,
  th,
  thEnd,
} from '../ui';
import { pickEnum, useClampPage, useListParams } from '../use-list-params';
import { OrdersSubNav } from './OrdersSubNav';
import {
  PAYMENT_FILTERS,
  type PaymentFilter,
  paymentOrderLabel,
  paymentProviderLabel,
  paymentStatusMeta,
} from './payments';

const PAGE_SIZE = 20;

function FilterChips({
  value,
  onChange,
}: {
  value?: PaymentFilter;
  onChange: (v: PaymentFilter | null) => void;
}) {
  const chips: { value: PaymentFilter | null; label: string }[] = [
    { value: null, label: 'Tất cả' },
    ...PAYMENT_FILTERS.map((s) => ({ value: s, label: paymentStatusMeta(s).label })),
  ];
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Lọc theo kết quả đối soát</legend>
      {chips.map((c) => {
        const active = (c.value ?? undefined) === value;
        return (
          <button
            key={c.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(c.value)}
            className={cn(
              'focus-ring inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
              active
                ? 'border-fg text-fg shadow-[0_0_0_1px_var(--color-fg)]'
                : 'border-border-strong bg-transparent text-muted hover:border-fg hover:text-fg',
            )}
          >
            {c.label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function PaymentsPage() {
  const { get, set, page } = useListParams();
  const status = pickEnum(get('status'), PAYMENT_FILTERS);
  const filter = { page, pageSize: PAGE_SIZE, status };
  const query = useQuery({
    queryKey: queryKeys.admin.payments(filter),
    queryFn: () => adminApi.payments(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  useClampPage(page, query.isPlaceholderData ? undefined : query.data?.total, PAGE_SIZE, set);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Đối soát VietQR" />
      <OrdersSubNav current="/admin/orders/payments" />
      <p className="max-w-3xl text-sm text-muted">
        Mọi khoản chuyển khoản ngân hàng báo về qua SePay, kể cả giao dịch không ghi đúng mã đơn. Giao dịch{' '}
        <strong className="font-semibold text-fg">Không khớp đơn</strong> cần đối chiếu sao kê, rồi xác nhận
        tay trên đơn tương ứng hoặc hoàn tiền cho khách.
      </p>
      <FilterChips value={status} onChange={(v) => set({ status: v })} />

      <TableFrame className={refetchClass(query.isFetching && !query.isRefetching, Boolean(query.data))}>
        {query.isPending ? (
          <TableSkeleton cols={5} />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={<QrCode />}
            title={
              status ? `Không có giao dịch “${paymentStatusMeta(status).label}”` : 'Chưa có giao dịch nào'
            }
            description={
              status
                ? 'Chọn “Tất cả” để xem mọi giao dịch đã nhận.'
                : 'Giao dịch sẽ hiện ở đây ngay khi ngân hàng báo có tiền vào tài khoản nhận VietQR.'
            }
            actions={
              status && (
                <Button variant="secondary" size="sm" onClick={() => set({ status: null })}>
                  Xem tất cả
                </Button>
              )
            }
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Thời gian</th>
                <th className={thEnd}>Số tiền</th>
                <th className={th}>Nội dung chuyển khoản</th>
                <th className={th}>Đơn hàng</th>
                <th className={th}>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((p) => {
                const s = paymentStatusMeta(p.status);
                const order = paymentOrderLabel(p);
                return (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDateTime(p.createdAt)}</td>
                    <td className={cn(td, 'text-end')}>
                      <Price amount={p.amount} size="sm" />
                    </td>
                    <td className={cn(td, 'min-w-56')}>
                      <div className="font-mono text-xs break-words text-fg">{p.transferContent ?? '—'}</div>
                      <div className="mt-1 text-xs text-muted">
                        {paymentProviderLabel(p.provider)}
                        {p.providerTxnId && <span className="tabular-nums"> · #{p.providerTxnId}</span>}
                      </div>
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      {order.code ? (
                        <Link
                          href={`/admin/orders/${order.code}`}
                          className="focus-ring rounded-xs font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
                        >
                          {order.text}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted italic">{order.text}</span>
                      )}
                    </td>
                    <td className={td}>
                      <StatusText tone={s.tone}>{s.label}</StatusText>
                    </td>
                  </tr>
                );
              })}
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
