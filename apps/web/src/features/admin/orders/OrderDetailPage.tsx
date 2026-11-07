'use client';

import type { AdminOrderDetailDTO, AdminPaymentDTO, OrderItemDTO } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, QrCode, Receipt } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { OrderStatusBadge, OrderTypeBadge, PaymentStatusBadge } from '../badges';
import { formatDateTime } from '../format';
import { OrderStatusControl } from '../OrderStatusControl';
import { PageSkeleton, QueryError, tableClass, td, th, thEnd } from '../ui';
import { OrderTimeline } from './OrderTimeline';

const PAYMENT_LABEL: Record<string, { label: string; tone: NonNullable<BadgeProps['tone']> }> = {
  SUCCESS: { label: 'Khớp, đã ghi nhận', tone: 'ok' },
  UNDERPAID: { label: 'Chuyển thiếu', tone: 'warn' },
  MANUAL_REVIEW: { label: 'Cần đối soát tay', tone: 'warn' },
};

const PROVIDER_LABEL: Record<string, string> = {
  SEPAY: 'SePay (webhook)',
  SIMULATOR: 'Giả lập',
};

function groupItems(items: OrderItemDTO[]): { buildId: string | null; items: OrderItemDTO[] }[] {
  const groups = new Map<string | null, OrderItemDTO[]>();
  for (const item of items) groups.set(item.buildId, [...(groups.get(item.buildId) ?? []), item]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : 0) - (b === null ? 1 : 0))
    .map(([buildId, list]) => ({ buildId, items: list }));
}

function ItemsCard({ order }: { order: AdminOrderDetailDTO }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sản phẩm ({order.items.reduce((n, i) => n + i.qty, 0)})</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto pt-3">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={th}>Sản phẩm</th>
              <th className={thEnd}>Đơn giá</th>
              <th className={thEnd}>SL</th>
              <th className={thEnd}>Thành tiền</th>
            </tr>
          </thead>
          {groupItems(order.items).map((g) => (
            <tbody key={g.buildId ?? 'retail'}>
              {g.buildId && (
                <tr className="bg-surface-2">
                  <td colSpan={4} className="px-4 py-2 text-xs">
                    <span className="font-semibold text-fg">Bộ PC</span>{' '}
                    <Link
                      href={`/builds/${g.buildId}`}
                      target="_blank"
                      className="focus-ring inline-flex items-center gap-1 rounded-xs font-mono text-accent-ink hover:underline"
                    >
                      {g.buildId.slice(0, 8)} <ExternalLink className="size-3" aria-hidden />
                    </Link>
                  </td>
                </tr>
              )}
              {g.items.map((item) => (
                <tr key={`${item.productId}:${item.buildId ?? ''}`}>
                  <td className={cn(td, 'min-w-56')}>
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="focus-ring rounded-xs text-fg hover:text-accent-ink hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className={cn(td, 'text-end')}>
                    <Price amount={item.price} size="sm" tone="muted" />
                  </td>
                  <td className={cn(td, 'text-end font-mono tabular-nums')}>{item.qty}</td>
                  <td className={cn(td, 'text-end')}>
                    <Price amount={item.price * item.qty} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <dl className="grid gap-2 border-t border-border px-5 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tạm tính</dt>
          <dd>
            <Price amount={order.subtotal} size="sm" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Phí lắp ráp</dt>
          <dd>
            <Price amount={order.assemblyFee} size="sm" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Phí vận chuyển</dt>
          <dd>{order.shippingFee === 0 ? 'Miễn phí' : <Price amount={order.shippingFee} size="sm" />}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd>
            <Price amount={order.total} size="xl" />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Reconciliation({ order }: { order: AdminOrderDetailDTO }) {
  const matched = order.payments.filter((p) => p.status === 'SUCCESS');
  const received = order.payments.reduce((n, p) => n + p.amount, 0);
  if (order.payments.length === 0) {
    return (
      <p className="text-sm text-muted">
        Chưa có giao dịch nào. Hệ thống chờ chuyển khoản{' '}
        <strong className="font-mono text-fg">{formatVnd(order.total)}</strong> với nội dung{' '}
        <strong className="font-mono text-fg">{order.code}</strong>.
      </p>
    );
  }
  const unmatched = order.payments.filter((p) => p.status !== 'SUCCESS');
  const unmatchedSum = unmatched.reduce((n, p) => n + p.amount, 0);
  if (matched.length === 0) {
    return (
      <p className="text-sm text-warn-ink">
        Chưa khớp: đã nhận {formatVnd(received)}, đơn cần {formatVnd(order.total)}. Kiểm tra sao kê ngân hàng
        rồi xác nhận tay nếu đúng.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <p className="text-ok-ink">
        Đã khớp: giao dịch {formatVnd(matched.reduce((n, p) => n + p.amount, 0))} cho đơn{' '}
        {formatVnd(order.total)}.
      </p>
      {unmatched.length > 0 && (
        <p className="text-warn-ink">
          Còn {unmatched.length} giao dịch không khớp ({formatVnd(unmatchedSum)}) cần đối soát hoặc hoàn lại
          cho khách.
        </p>
      )}
    </div>
  );
}

function PaymentsCard({ order }: { order: AdminOrderDetailDTO }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4 text-muted" aria-hidden />
          Đối soát VietQR
        </CardTitle>
        <Reconciliation order={order} />
      </CardHeader>
      {order.payments.length > 0 ? (
        <div className="overflow-x-auto pt-3">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Thời gian</th>
                <th className={th}>Nguồn</th>
                <th className={th}>Nội dung chuyển khoản</th>
                <th className={thEnd}>Số tiền</th>
                <th className={th}>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p: AdminPaymentDTO) => {
                const s = PAYMENT_LABEL[p.status] ?? { label: p.status, tone: 'neutral' as const };
                return (
                  <tr key={p.id}>
                    <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDateTime(p.createdAt)}</td>
                    <td className={td}>
                      <div>{PROVIDER_LABEL[p.provider] ?? p.provider}</div>
                      {p.providerTxnId && (
                        <div
                          className="max-w-40 truncate font-mono text-xs text-muted"
                          title={p.providerTxnId}
                        >
                          #{p.providerTxnId}
                        </div>
                      )}
                    </td>
                    <td className={cn(td, 'font-mono text-xs')}>{p.transferContent ?? '—'}</td>
                    <td className={cn(td, 'text-end')}>
                      <Price amount={p.amount} size="sm" />
                    </td>
                    <td className={td}>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <CardContent />
      )}
    </Card>
  );
}

function CustomerCard({ order }: { order: AdminOrderDetailDTO }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Người nhận</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Họ tên</dt>
            <dd className="font-medium">{order.shippingName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Điện thoại</dt>
            <dd>
              <a
                href={`tel:${order.phone}`}
                className="focus-ring rounded-xs font-mono text-accent-ink hover:underline"
              >
                {order.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Địa chỉ</dt>
            <dd>{order.address}</dd>
          </div>
          {order.note && (
            <div>
              <dt className="text-xs text-muted">Ghi chú</dt>
              <dd className="whitespace-pre-line">{order.note}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted">Tài khoản</dt>
            <dd>{order.userEmail ?? 'Khách vãng lai (không đăng nhập)'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function OrderDetailPage({ code }: { code: string }) {
  const query = useQuery({
    queryKey: queryKeys.admin.order(code),
    queryFn: () => adminApi.order(code),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING_PAYMENT' ? 5_000 : false),
  });
  const title = `Đơn ${code}`;

  if (query.isPending) {
    return (
      <>
        <AdminPageHeader title={title} />
        <PageSkeleton />
      </>
    );
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        <AdminPageHeader title={title} />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<Receipt />}
              title="Không tìm thấy đơn hàng"
              description={`Không có đơn nào mang mã ${code}. Kiểm tra lại mã hoặc tìm trong danh sách.`}
              actions={
                <Button asChild variant="secondary">
                  <Link href="/admin/orders">Về danh sách đơn</Link>
                </Button>
              }
            />
          ) : (
            <QueryError error={query.error} onRetry={() => query.refetch()} compact={false} />
          )}
        </Card>
      </>
    );
  }

  const order = query.data;
  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader title={<span className="font-mono">{title}</span>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="link" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft aria-hidden />
            Danh sách đơn hàng
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <OrderStatusBadge status={order.status} type={order.type} />
          <OrderTypeBadge type={order.type} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Chuyển trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusControl order={order} />
            </CardContent>
          </Card>
          <ItemsCard order={order} />
          <PaymentsCard order={order} />
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tiến trình</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
              {order.status === 'PENDING_PAYMENT' && order.expiresAt && (
                <p className="mt-4 text-xs text-muted">
                  Giữ hàng tới {formatDateTime(order.expiresAt)}; quá hạn chưa thanh toán đơn sẽ tự hủy. Trang
                  tự cập nhật mỗi 5 giây.
                </p>
              )}
            </CardContent>
          </Card>
          <CustomerCard order={order} />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <OrderDetailPage code={decodeURIComponent(code)} />;
}
