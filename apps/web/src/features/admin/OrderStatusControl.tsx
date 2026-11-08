'use client';

import type { OrderDTO, OrderStatus } from '@pc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAdminRole } from './AdminChrome';
import { adminApi } from './api';
import { errorMessage } from './errors';
import { orderStatusLabel } from './format';
import { type TransitionOption, transitionOptions } from './orders/order-state';

/**
 * Buttons for the legal next statuses only. Destructive or stock-moving steps ask for an in-page
 * confirmation; the server stays the authority and a stale view is refreshed on conflict.
 */
export function OrderStatusControl({ order }: { order: Pick<OrderDTO, 'code' | 'status' | 'type'> }) {
  const qc = useQueryClient();
  const { role } = useAdminRole();
  const [pending, setPending] = useState<TransitionOption | null>(null);
  const options = transitionOptions(order, role);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.order(order.code) });
    void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.summary });
    void qc.invalidateQueries({ queryKey: ['admin', 'revenue'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  const change = useMutation({
    mutationFn: (to: OrderStatus) => adminApi.setOrderStatus(order.code, to),
    onSuccess: (updated) => {
      setPending(null);
      refresh();
      toast({
        title: `Đơn ${updated.code}: ${orderStatusLabel(updated.status, updated.type)}`,
        tone: 'success',
      });
    },
    onError: (err) => {
      setPending(null);
      const stale = err instanceof ApiError && err.status === 409;
      toast({
        title: stale ? 'Trạng thái đơn đã thay đổi' : 'Không đổi được trạng thái',
        description: stale ? `${err.message}. Đã tải lại đơn hàng.` : errorMessage(err),
        tone: 'error',
      });
      if (stale) refresh();
    },
  });

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted">
        Đơn đã {order.status === 'COMPLETED' ? 'hoàn thành' : 'hủy'}, không còn bước tiếp theo.
      </p>
    );
  }

  const run = (o: TransitionOption) => (o.confirm ? setPending(o) : change.mutate(o.to));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.to}
            variant={o.variant}
            disabled={!o.allowed || change.isPending}
            loading={change.isPending && change.variables === o.to}
            onClick={() => run(o)}
            aria-describedby={o.reason ? `reason-${o.to}` : undefined}
          >
            {!o.allowed && <Lock aria-hidden />}
            {o.label}
            {o.variant === 'primary' && <ArrowRight aria-hidden />}
          </Button>
        ))}
      </div>
      {options
        .filter((o) => o.reason)
        .map((o) => (
          <p key={o.to} id={`reason-${o.to}`} className="text-xs text-muted">
            {o.reason}
          </p>
        ))}
      {pending && (
        <div
          role="alertdialog"
          aria-label={`Xác nhận: ${pending.label}`}
          className={
            pending.variant === 'danger'
              ? 'flex flex-col gap-3 rounded-md border border-danger/40 bg-danger/8 p-4'
              : 'flex flex-col gap-3 rounded-md border border-warn/45 bg-warn/10 p-4'
          }
        >
          <p className="text-sm text-fg">
            <strong>{pending.label}</strong> cho đơn <span className="tabular-nums">{order.code}</span>?{' '}
            {pending.confirm}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={pending.variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              loading={change.isPending}
              onClick={() => change.mutate(pending.to)}
            >
              Xác nhận
            </Button>
            <Button variant="ghost" size="sm" disabled={change.isPending} onClick={() => setPending(null)}>
              Không, giữ nguyên
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
