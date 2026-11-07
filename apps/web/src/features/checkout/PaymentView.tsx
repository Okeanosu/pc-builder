'use client';

import type { OrderDTO, PaymentInfoDTO } from '@pc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleCheck, Copy, FlaskConical, PackageSearch, TimerOff } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { OrderStatusBadge, OrderSummary } from '../account/OrderSummary';
import { OrderTimeline } from '../account/OrderTimeline';
import { apiErrorMessage } from '../auth/form-errors';
import { ReorderButton } from '../cart/ReorderButton';
import { clockOffset, receiptTime } from './clock';
import { formatCountdown, remainingMs } from './countdown';
import { bankName, isSettled, paymentPhase } from './payment';

const POLL_MS = 3000;
const SHOW_SIMULATOR = process.env.NODE_ENV !== 'production';

// Only the first payment view in a document can be the hard load the navigation timing entry describes.
let documentTimingUsed = false;

/** Server-minus-device clock offset, measured once against the timestamp the server rendered the page with. */
function useClockOffset(serverTime: number | undefined): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = documentTimingUsed ? undefined : entry;
    documentTimingUsed = true;
    setOffset(clockOffset(serverTime, receiptTime(nav, window.location.href, Date.now(), performance.now())));
  }, [serverTime]);
  return offset;
}

/** Server time, ticking every second while `active`; null until mounted so server and client markup agree. */
function useServerNow(active: boolean, offset: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now() + offset);
    if (!active) return;
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [active, offset]);
  return now;
}

function CopyRow({
  label,
  value,
  display,
  mono = true,
}: {
  label: string;
  value: string;
  display?: ReactNode;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: `Đã sao chép ${label.toLowerCase()}`, tone: 'success', duration: 2000 });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Trình duyệt chặn sao chép', description: value, tone: 'warning' });
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={cn('break-all text-base font-semibold text-fg', mono && 'font-mono tabular-nums')}>
          {display ?? value}
        </dd>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void copy()}
        aria-label={`Sao chép ${label.toLowerCase()}`}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        <span className="max-sm:sr-only">{copied ? 'Đã chép' : 'Sao chép'}</span>
      </Button>
    </div>
  );
}

function PaySkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]" aria-busy>
      <Skeleton className="aspect-[5/6] w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}

function SummaryCard({ order }: { order: OrderDTO | undefined }) {
  return (
    <section
      aria-labelledby="pay-summary"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="pay-summary" className="text-base font-semibold text-fg">
        Tóm tắt đơn hàng
      </h2>
      {order ? <OrderSummary order={order} /> : <Skeleton className="h-40 w-full" />}
    </section>
  );
}

export function PaymentView({ code, serverTime }: { code: string; serverTime?: number }) {
  const qc = useQueryClient();
  const authReady = useAuthStore((s) => s.status === 'ready');
  const signedIn = useAuthStore((s) => Boolean(s.user));
  const payment = useQuery({
    queryKey: queryKeys.payment(code),
    queryFn: () => api<PaymentInfoDTO>(`/orders/${code}/payment`),
    enabled: authReady,
    refetchInterval: (q) => (q.state.data && isSettled(paymentPhase(q.state.data, null)) ? false : POLL_MS),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  const order = useQuery({
    queryKey: queryKeys.order(code),
    queryFn: () => api<OrderDTO>(`/orders/${code}`),
    enabled: authReady,
  });

  const info = payment.data;
  const settled = info ? isSettled(paymentPhase(info, null)) : false;
  const offset = useClockOffset(serverTime);
  const now = useServerNow(!settled, offset);
  const remaining = info && now !== null ? remainingMs(info.expiresAt, now) : null;
  const phase = info ? paymentPhase(info, remaining) : 'pending';

  useEffect(() => {
    if (!settled) return;
    void qc.invalidateQueries({ queryKey: queryKeys.order(code) });
    void qc.invalidateQueries({ queryKey: queryKeys.myOrders });
  }, [settled, qc, code]);

  const simulate = useMutation({
    mutationFn: () => api<PaymentInfoDTO>(`/payments/${code}/simulate`, { method: 'POST', json: {} }),
    onSuccess: (data) => qc.setQueryData(queryKeys.payment(code), data),
    onError: (error) =>
      toast({ title: 'Giả lập thất bại', description: apiErrorMessage(error), tone: 'error' }),
  });

  const header = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">
        Đơn <span className="font-mono">{code}</span>
      </h1>
      {info && <OrderStatusBadge status={info.status} />}
    </div>
  );

  if (payment.isPending) {
    return (
      <>
        {header}
        <PaySkeleton />
      </>
    );
  }

  if (payment.isError || !info) {
    const missing = payment.error instanceof ApiError && payment.error.status === 404;
    return (
      <>
        {header}
        <EmptyState
          tone={missing ? 'empty' : 'error'}
          icon={<PackageSearch />}
          title={missing ? 'Không tìm thấy đơn hàng' : 'Chưa tải được thông tin thanh toán'}
          description={
            missing
              ? signedIn
                ? 'Mã đơn không đúng hoặc đơn thuộc tài khoản khác. Xem lại danh sách đơn của bạn.'
                : 'Đơn đặt khi chưa đăng nhập chỉ xem được trên trình duyệt đã đặt. Đăng nhập nếu bạn đặt bằng tài khoản.'
              : 'Máy chủ không phản hồi. Nếu bạn đã chuyển khoản, đơn vẫn được ghi nhận tự động.'
          }
          actions={
            missing ? (
              <Button asChild>
                <Link href={signedIn ? '/account/orders' : `/login?redirect=/orders/${code}/pay`}>
                  {signedIn ? 'Đơn hàng của tôi' : 'Đăng nhập'}
                </Link>
              </Button>
            ) : (
              <Button onClick={() => void payment.refetch()}>Thử lại</Button>
            )
          }
        />
      </>
    );
  }

  if (phase === 'paid') {
    return (
      <>
        {header}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            className="flex flex-col gap-6 rounded-lg border border-ok/45 bg-surface p-6"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-ok/16 text-ok-ink">
                <CircleCheck className="size-6" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-fg">Đã nhận thanh toán</h2>
                <p className="text-sm text-muted">
                  Cảm ơn bạn! Đơn <span className="font-mono text-fg">{code}</span> đã được xác nhận
                  {order.data?.paidAt ? ' tự động' : ''}. Chúng tôi sẽ gọi số điện thoại bạn để lại trước khi
                  giao.
                </p>
              </div>
            </div>
            {order.data && <OrderTimeline order={order.data} />}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/orders/${code}`}>Xem đơn hàng</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Tiếp tục mua sắm</Link>
              </Button>
            </div>
          </section>
          <SummaryCard order={order.data} />
        </div>
      </>
    );
  }

  if (phase === 'cancelled' || phase === 'expired') {
    return (
      <>
        {header}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-lg border border-border bg-surface">
            <EmptyState
              tone="error"
              icon={<TimerOff />}
              title={phase === 'expired' ? 'Mã QR đã hết hạn' : 'Đơn hàng đã hủy'}
              description={
                phase === 'expired'
                  ? 'Đã quá 15 phút giữ hàng nên đơn sẽ tự hủy. Nếu bạn vừa chuyển khoản, trang này vẫn tự cập nhật trong giây lát; nếu chưa, hãy đặt lại để nhận mã mới.'
                  : 'Đơn đã hủy và hàng đã được trả về kho. Đặt lại để nhận mã QR mới; giá và tồn kho sẽ được tính lại.'
              }
              actions={
                <>
                  <ReorderButton items={order.data?.items} />
                  <Button asChild variant="outline">
                    <Link href="/">Tiếp tục mua sắm</Link>
                  </Button>
                </>
              }
            />
            {phase === 'expired' && (
              <p className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 text-xs text-muted">
                <Spinner size="sm" label={null} />
                Đang kiểm tra giao dịch muộn…
              </p>
            )}
          </div>
          <SummaryCard order={order.data} />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-labelledby="pay-qr"
          className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1">
            <h2 id="pay-qr" className="text-lg font-semibold text-fg">
              Quét mã để chuyển khoản
            </h2>
            <p className="text-sm text-muted">
              Mở app ngân hàng, chọn quét QR. Số tiền và nội dung đã điền sẵn, bạn chỉ cần xác nhận.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start">
            {/* Always on white so banking apps can scan it, even in dark mode. */}
            <div className="mx-auto w-full max-w-64 rounded-md border border-border bg-white p-3">
              {/* biome-ignore lint/performance/noImgElement: VietQR returns a ready PNG; optimising it adds nothing */}
              <img
                src={info.qrImageUrl}
                alt={`Mã VietQR chuyển ${formatVnd(info.amount)} cho đơn ${info.orderCode}`}
                className="block h-auto w-full"
                width={540}
                height={640}
              />
            </div>
            <div className="flex flex-col gap-4">
              <dl className="flex flex-col">
                <CopyRow
                  label="Số tiền"
                  value={String(info.amount)}
                  display={<Price amount={info.amount} size="xl" />}
                />
                <CopyRow label="Nội dung chuyển khoản" value={info.transferContent} />
                <CopyRow
                  label="Số tài khoản"
                  value={info.accountNo}
                  display={
                    <>
                      {info.accountNo}
                      <span className="block font-sans text-sm font-normal text-muted">
                        {bankName(info.bankBin)} · {info.accountName}
                      </span>
                    </>
                  }
                />
              </dl>
              <div className="flex flex-col gap-1 rounded-md bg-surface-2 px-4 py-3">
                <span className="text-xs text-muted">Hết hạn sau</span>
                <span
                  className={cn(
                    'font-mono text-2xl font-semibold tabular-nums',
                    remaining !== null && remaining < 120_000 ? 'text-warn-ink' : 'text-fg',
                  )}
                  role="timer"
                  aria-live="off"
                >
                  {remaining === null ? '--:--' : formatCountdown(remaining)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
              <Spinner size="sm" label={null} className="text-accent-ink" />
              Đang chờ ngân hàng xác nhận… tự cập nhật mỗi 3 giây
            </p>
            {SHOW_SIMULATOR && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => simulate.mutate()}
                loading={simulate.isPending}
              >
                {!simulate.isPending && <FlaskConical aria-hidden />}
                Giả lập thanh toán (dev)
              </Button>
            )}
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <SummaryCard order={order.data} />
          <p className="flex items-start gap-2 text-xs text-muted">
            <Badge tone="warn" size="sm">
              Lưu ý
            </Badge>
            Chuyển đúng số tiền và giữ nguyên nội dung để đơn được xác nhận tự động.
          </p>
        </div>
      </div>
    </>
  );
}
