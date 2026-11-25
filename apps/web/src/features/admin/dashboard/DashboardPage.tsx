'use client';

import { ORDER_STATUSES, type OrderStatus } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { OrderStatusBadge, OrderTypeBadge } from '../badges';
import { formatDateTime, orderStatusLabel } from '../format';
import { RevenueChart } from '../RevenueChart';
import { QueryError, TableFrame, tableClass, td, th, thEnd } from '../ui';

/** One figure in the KPI row: label, a large tabular value, a quiet footnote. Cells are split by hairlines. */
function Figure({
  label,
  children,
  footer,
  href,
}: {
  label: string;
  children: ReactNode;
  footer: ReactNode;
  href?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-bg py-4 pe-5 sm:even:ps-5 xl:not-first:ps-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-semibold text-fg tabular-nums">{children}</dd>
      <dd className="text-xs text-muted">
        {href ? (
          <Link
            href={href}
            className="focus-ring rounded-xs underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-current"
          >
            {footer}
          </Link>
        ) : (
          footer
        )}
      </dd>
    </div>
  );
}

const figureRow = 'grid gap-px border-y border-border bg-border sm:grid-cols-2 xl:grid-cols-4';

function SummaryTiles() {
  const summary = useQuery({ queryKey: queryKeys.admin.summary, queryFn: adminApi.summary });
  if (summary.isPending) {
    return (
      <div className={figureRow} aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 bg-bg py-4 pe-5 sm:even:ps-5 xl:not-first:ps-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    );
  }
  if (summary.isError) {
    return (
      <div className="border-y border-border">
        <QueryError error={summary.error} onRetry={() => summary.refetch()} />
      </div>
    );
  }
  const s = summary.data;
  const toHandle = s.ordersByStatus.PAID + s.ordersByStatus.PROCESSING;
  return (
    <dl className={figureRow}>
      <Figure label="Doanh thu hôm nay" footer={`${s.todayOrders} đơn đã thanh toán hôm nay`}>
        <Price amount={s.todayRevenue} size="2xl" className="font-semibold" />
      </Figure>
      <Figure
        label="Đơn chờ thanh toán"
        footer={`${toHandle} đơn đã thanh toán cần xử lý`}
        href="/admin/orders?status=PAID"
      >
        {s.ordersByStatus.PENDING_PAYMENT}
      </Figure>
      <Figure label="Sắp hết hàng" footer="Còn bán được ≤ 3 sản phẩm · mở Tồn kho" href="/admin/inventory">
        <span className={cn(s.lowStockCount > 0 && 'text-warn-ink')}>{s.lowStockCount}</span>
      </Figure>
      <Figure label="Hội thoại AI 7 ngày" footer="Xem cách chatbot lập luận" href="/admin/chats">
        {s.chatSessionsLast7Days}
      </Figure>
    </dl>
  );
}

function OrdersByStatus() {
  const summary = useQuery({ queryKey: queryKeys.admin.summary, queryFn: adminApi.summary });
  const counts = summary.data?.ordersByStatus;
  const total = counts ? ORDER_STATUSES.reduce((n, s) => n + counts[s], 0) : 0;
  return (
    <section aria-labelledby="dash-by-status" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 id="dash-by-status" className="text-lg font-semibold text-fg">
          Đơn hàng theo trạng thái
        </h2>
        <span className="text-sm text-muted tabular-nums">{counts ? `${total} đơn` : ''}</span>
      </div>
      {counts ? (
        <ul className="flex flex-col">
          {ORDER_STATUSES.map((status: OrderStatus) => (
            <li key={status} className="border-b border-border">
              <Link
                href={`/admin/orders?status=${status}`}
                className="focus-ring -mx-2 flex h-10 items-center justify-between gap-3 rounded-sm px-2 text-sm hover:bg-surface-2"
                aria-label={`${orderStatusLabel(status)}: ${counts[status]} đơn`}
              >
                <OrderStatusBadge status={status} />
                <span className="text-fg tabular-nums">{counts[status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3 pt-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      )}
    </section>
  );
}

function FallbackShare() {
  const all = useQuery({
    queryKey: queryKeys.admin.chats({ pageSize: 1 }),
    queryFn: () => adminApi.chats({ pageSize: 1 }),
  });
  const fallback = useQuery({
    queryKey: queryKeys.admin.chats({ pageSize: 1, mode: 'FALLBACK' }),
    queryFn: () => adminApi.chats({ pageSize: 1, mode: 'FALLBACK' }),
  });
  const total = all.data?.total ?? 0;
  const fb = fallback.data?.total ?? 0;
  const share = total > 0 ? fb / total : 0;
  return (
    <section aria-labelledby="dash-fallback" className="flex flex-col gap-3">
      <h2 id="dash-fallback" className="border-b border-border pb-3 text-lg font-semibold text-fg">
        Tỉ lệ chế độ dự phòng
      </h2>
      {all.isPending || fallback.isPending ? (
        <Skeleton className="h-12" />
      ) : total === 0 ? (
        <p className="text-sm text-muted">
          Chưa có phiên hội thoại nào. Tỉ lệ sẽ hiện khi khách bắt đầu chat với AI.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="text-2xl font-semibold text-fg tabular-nums">{formatPercent(share, 1)}</span>{' '}
            phiên chạy bằng bộ hiểu ngôn ngữ dự phòng (
            <span className="tabular-nums">
              {fb}/{total}
            </span>
            ) khi Gemini không phản hồi.
          </p>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-xs" aria-hidden>
            <span className="bg-fg" style={{ flexGrow: total - fb }} />
            {fb > 0 && <span className="bg-warn" style={{ flexGrow: fb }} />}
          </div>
          <div className="flex gap-4 text-xs text-muted tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-fg" aria-hidden /> AI ({total - fb})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-warn" aria-hidden /> Dự phòng ({fb})
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function RecentOrders() {
  const orders = useQuery({
    queryKey: queryKeys.admin.orders({ pageSize: 6 }),
    queryFn: () => adminApi.orders({ pageSize: 6 }),
  });
  return (
    <section aria-labelledby="dash-recent" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="dash-recent" className="text-lg font-semibold text-fg">
          Đơn hàng mới
        </h2>
        <Button asChild variant="link" size="sm">
          <Link href="/admin/orders">
            Tất cả đơn hàng <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <TableFrame>
        {orders.isPending ? (
          <div className="flex flex-col gap-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : orders.isError ? (
          <QueryError error={orders.error} onRetry={() => orders.refetch()} />
        ) : orders.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageOpen />}
            title="Chưa có đơn hàng"
            description="Đơn mới sẽ hiện ở đây ngay khi khách đặt hàng trên cửa hàng."
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Mã đơn</th>
                <th className={th}>Khách hàng</th>
                <th className={th}>Trạng thái</th>
                <th className={thEnd}>Tổng tiền</th>
                <th className={th}>Đặt lúc</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2">
                  <td className={td}>
                    <Link
                      href={`/admin/orders/${o.code}`}
                      className="focus-ring rounded-xs font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
                    >
                      {o.code}
                    </Link>
                    <div className="mt-0.5">
                      <OrderTypeBadge type={o.type} />
                    </div>
                  </td>
                  <td className={td}>
                    <div className="font-medium">{o.shippingName}</div>
                    <div className="text-xs text-muted">{o.phone}</div>
                  </td>
                  <td className={td}>
                    <OrderStatusBadge status={o.status} type={o.type} />
                  </td>
                  <td className={`${td} text-end`}>
                    <Price amount={o.total} size="sm" />
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableFrame>
    </section>
  );
}

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Tổng quan" />
      <SummaryTiles />
      <RevenueChart />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
        <RecentOrders />
        <div className="flex flex-col gap-10">
          <OrdersByStatus />
          <FallbackShare />
        </div>
      </div>
    </div>
  );
}
