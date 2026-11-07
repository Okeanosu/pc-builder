'use client';

import { ORDER_STATUSES, type OrderStatus } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, Bot, PackageOpen, Receipt, Warehouse } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

function StatTile({
  label,
  icon,
  children,
  footer,
  href,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  href?: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{label}</span>
        <span className="text-muted [&_svg]:size-4" aria-hidden>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-semibold text-fg">{children}</div>
      <div className="text-xs text-muted">
        {href ? (
          <Link href={href} className="focus-ring rounded-xs text-accent-ink hover:underline">
            {footer}
          </Link>
        ) : (
          footer
        )}
      </div>
    </Card>
  );
}

function SummaryTiles() {
  const summary = useQuery({ queryKey: queryKeys.admin.summary, queryFn: adminApi.summary });
  if (summary.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[116px] rounded-md" />
        ))}
      </div>
    );
  }
  if (summary.isError) {
    return (
      <Card>
        <QueryError error={summary.error} onRetry={() => summary.refetch()} />
      </Card>
    );
  }
  const s = summary.data;
  const toHandle = s.ordersByStatus.PAID + s.ordersByStatus.PROCESSING;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Doanh thu hôm nay"
        icon={<Banknote />}
        footer={`${s.todayOrders} đơn đã thanh toán hôm nay`}
      >
        <Price amount={s.todayRevenue} size="2xl" className="font-semibold" />
      </StatTile>
      <StatTile
        label="Đơn chờ thanh toán"
        icon={<Receipt />}
        footer={`${toHandle} đơn đã thanh toán cần xử lý`}
        href="/admin/orders?status=PAID"
      >
        {s.ordersByStatus.PENDING_PAYMENT}
      </StatTile>
      <StatTile
        label="Sắp hết hàng"
        icon={<Warehouse />}
        footer="Còn bán được ≤ 3 sản phẩm · mở Tồn kho"
        href="/admin/inventory"
      >
        <span className={cn(s.lowStockCount > 0 && 'text-warn-ink')}>{s.lowStockCount}</span>
      </StatTile>
      <StatTile
        label="Hội thoại AI 7 ngày"
        icon={<Bot />}
        footer="Xem cách chatbot lập luận"
        href="/admin/chats"
      >
        {s.chatSessionsLast7Days}
      </StatTile>
    </div>
  );
}

function OrdersByStatus() {
  const summary = useQuery({ queryKey: queryKeys.admin.summary, queryFn: adminApi.summary });
  const counts = summary.data?.ordersByStatus;
  const total = counts ? ORDER_STATUSES.reduce((n, s) => n + counts[s], 0) : 0;
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-2 p-5 pb-3">
        <h2 className="text-base font-semibold text-fg">Đơn hàng theo trạng thái</h2>
        <span className="font-mono text-sm text-muted tabular-nums">{counts ? `${total} đơn` : ''}</span>
      </div>
      {counts ? (
        <ul className="flex flex-col px-2 pb-3">
          {ORDER_STATUSES.map((status: OrderStatus) => (
            <li key={status}>
              <Link
                href={`/admin/orders?status=${status}`}
                className="focus-ring flex h-10 items-center justify-between gap-3 rounded-sm px-3 text-sm hover:bg-surface-2"
                aria-label={`${orderStatusLabel(status)}: ${counts[status]} đơn`}
              >
                <OrderStatusBadge status={status} />
                <span className="font-mono text-fg tabular-nums">{counts[status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3 px-5 pb-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      )}
    </Card>
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
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold text-fg">Tỉ lệ chế độ dự phòng</h2>
      {all.isPending || fallback.isPending ? (
        <Skeleton className="h-12" />
      ) : total === 0 ? (
        <p className="text-sm text-muted">
          Chưa có phiên hội thoại nào. Tỉ lệ sẽ hiện khi khách bắt đầu chat với AI.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="font-mono text-xl font-semibold text-fg tabular-nums">
              {formatPercent(share, 1)}
            </span>{' '}
            phiên chạy bằng bộ hiểu ngôn ngữ dự phòng ({fb}/{total}) khi Gemini không phản hồi.
          </p>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            <span className="bg-ring" style={{ flexGrow: total - fb }} />
            {fb > 0 && <span className="bg-warn" style={{ flexGrow: fb }} />}
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ring" aria-hidden /> AI ({total - fb})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warn" aria-hidden /> Dự phòng ({fb})
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function RecentOrders() {
  const orders = useQuery({
    queryKey: queryKeys.admin.orders({ pageSize: 6 }),
    queryFn: () => adminApi.orders({ pageSize: 6 }),
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">Đơn hàng mới</h2>
        <Button asChild variant="link" size="sm">
          <Link href="/admin/orders">
            Tất cả đơn hàng <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <TableFrame>
        {orders.isPending ? (
          <div className="flex flex-col gap-3 p-4">
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
                      className="focus-ring rounded-xs font-mono font-medium text-accent-ink hover:underline"
                    >
                      {o.code}
                    </Link>
                    <div className="mt-1">
                      <OrderTypeBadge type={o.type} />
                    </div>
                  </td>
                  <td className={td}>
                    <div className="font-medium">{o.shippingName}</div>
                    <div className="font-mono text-xs text-muted">{o.phone}</div>
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
    </div>
  );
}

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Tổng quan" />
      <SummaryTiles />
      <RevenueChart />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <RecentOrders />
        <div className="flex flex-col gap-6">
          <OrdersByStatus />
          <FallbackShare />
        </div>
      </div>
    </div>
  );
}
