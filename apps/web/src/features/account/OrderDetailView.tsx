'use client';

import type { OrderDTO } from '@pc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageSearch, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '../auth/form-errors';
import { ReorderButton } from '../cart/ReorderButton';
import { OrderStatusBadge, OrderSummary, orderDate } from './OrderSummary';
import { OrderTimeline } from './OrderTimeline';

export function OrderDetailView({ code }: { code: string }) {
  const qc = useQueryClient();
  const authReady = useAuthStore((s) => s.status === 'ready');
  const signedIn = useAuthStore((s) => Boolean(s.user));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.order(code),
    queryFn: () => api<OrderDTO>(`/orders/${code}`),
    enabled: authReady,
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 2,
  });

  const cancel = useMutation({
    mutationFn: () => api<OrderDTO>(`/orders/${code}/cancel`, { method: 'POST' }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.order(code), updated);
      void qc.invalidateQueries({ queryKey: queryKeys.myOrders });
      void qc.invalidateQueries({ queryKey: queryKeys.payment(code) });
      setConfirmOpen(false);
      toast({ title: 'Đã hủy đơn hàng', description: 'Hàng đã được trả về kho.', tone: 'info' });
    },
    onError: (e) => toast({ title: 'Chưa hủy được đơn', description: apiErrorMessage(e), tone: 'error' }),
  });

  const back = signedIn ? (
    <Link
      href="/account/orders"
      className="focus-ring inline-flex w-fit items-center gap-1 rounded-xs text-sm text-muted hover:text-fg"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Đơn hàng của tôi
    </Link>
  ) : null;

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState
        tone={missing ? 'empty' : 'error'}
        icon={<PackageSearch />}
        title={missing ? 'Không tìm thấy đơn hàng' : 'Chưa tải được đơn hàng'}
        description={
          missing
            ? 'Mã đơn không đúng, hoặc đơn được đặt từ tài khoản hay trình duyệt khác.'
            : 'Máy chủ không phản hồi. Thử lại sau vài giây.'
        }
        actions={
          missing ? (
            <Button asChild>
              <Link href={signedIn ? '/account/orders' : `/login?redirect=/orders/${code}`}>
                {signedIn ? 'Đơn hàng của tôi' : 'Đăng nhập'}
              </Link>
            </Button>
          ) : (
            <Button onClick={() => void refetch()}>Thử lại</Button>
          )
        }
      />
    );
  }

  const pending = order.status === 'PENDING_PAYMENT';

  return (
    <div className="flex flex-col gap-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
              Đơn <span className="tabular-nums">{order.code}</span>
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted tabular-nums">
            Đặt lúc {orderDate.format(new Date(order.createdAt))} ·{' '}
            {order.type === 'BUILD' ? 'Lắp ráp nguyên bộ' : 'Mua linh kiện'}
          </p>
        </div>
        {order.status === 'CANCELLED' && <ReorderButton items={order.items} />}
        {pending && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              Hủy đơn
            </Button>
            <Button asChild>
              <Link href={`/orders/${order.code}/pay`}>
                <QrCode aria-hidden />
                Thanh toán ngay
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section aria-labelledby="order-items" className="flex flex-col gap-4">
          <h2 id="order-items" className="border-b border-border pb-3 text-lg font-semibold text-fg">
            Sản phẩm
          </h2>
          <OrderSummary order={order} />
        </section>
        <section aria-labelledby="order-progress" className="flex flex-col gap-4">
          <h2 id="order-progress" className="border-b border-border pb-3 text-lg font-semibold text-fg">
            Tiến trình
          </h2>
          <OrderTimeline order={order} />
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Hủy đơn hàng này?" description={`Đơn ${order.code} chưa thanh toán.`} size="sm">
          <DialogBody>
            <p className="text-sm text-muted">
              Hàng đang giữ cho bạn sẽ được trả về kho. Nếu bạn đã chuyển khoản, đừng hủy: đơn sẽ tự xác nhận
              trong vài phút.
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Giữ đơn</Button>
            </DialogClose>
            <Button variant="danger" onClick={() => cancel.mutate()} loading={cancel.isPending}>
              Hủy đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
