import { ORDER_STATUS_LABELS, type OrderDTO, type OrderItemDTO, type OrderStatus } from '@pc/shared';
import { CircleCheck, Clock, type LucideIcon, Truck, Wrench, X } from 'lucide-react';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';

/** Status reads as ink: green when money is in or the order is done, amber while it waits, red when cancelled. */
const STATUS_STYLE: Record<OrderStatus, { ink: string; icon: LucideIcon }> = {
  PENDING_PAYMENT: { ink: 'text-warn-ink', icon: Clock },
  PAID: { ink: 'text-ok-ink', icon: CircleCheck },
  PROCESSING: { ink: 'text-fg', icon: Wrench },
  SHIPPING: { ink: 'text-fg', icon: Truck },
  COMPLETED: { ink: 'text-ok-ink', icon: CircleCheck },
  CANCELLED: { ink: 'text-danger-ink', icon: X },
};

export function OrderStatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const { ink, icon: Icon } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm',
        ink,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export const orderDate = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function ItemRows({ items }: { items: OrderItemDTO[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <li
          key={`${i.productId}-${i.buildId ?? ''}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-border py-2 text-sm"
        >
          <span className="min-w-0 text-fg">
            <span className="line-clamp-2">{i.name}</span>
            <span className="text-xs text-muted tabular-nums">
              {i.qty} × <Price amount={i.price} size="sm" tone="muted" className="text-xs" />
            </span>
          </span>
          <Price amount={i.price * i.qty} size="sm" className="font-normal" />
        </li>
      ))}
    </ul>
  );
}

/** Items (build parts grouped), totals and delivery details of one order, laid out like a build sheet. */
export function OrderSummary({ order, className }: { order: OrderDTO; className?: string }) {
  const buildItems = order.items.filter((i) => i.buildId);
  const retail = order.items.filter((i) => !i.buildId);
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {buildItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg">
            {order.type === 'BUILD' ? 'Bộ PC lắp ráp sẵn' : 'Linh kiện theo cấu hình'}
          </span>
          <ItemRows items={buildItems} />
        </div>
      )}
      {retail.length > 0 && (
        <div className="flex flex-col gap-1">
          {buildItems.length > 0 && <span className="text-sm font-medium text-fg">Linh kiện lẻ</span>}
          <ItemRows items={retail} />
        </div>
      )}
      <dl className="flex flex-col text-sm">
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-muted">Tạm tính</dt>
          <dd>
            <Price amount={order.subtotal} size="sm" className="font-normal" />
          </dd>
        </div>
        {order.assemblyFee > 0 && (
          <div className="flex justify-between gap-3 py-1">
            <dt className="text-muted">Phí lắp ráp</dt>
            <dd>
              <Price amount={order.assemblyFee} size="sm" className="font-normal" />
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3 pt-1 pb-3">
          <dt className="text-muted">Phí vận chuyển</dt>
          <dd>
            {order.shippingFee > 0 ? (
              <Price amount={order.shippingFee} size="sm" className="font-normal" />
            ) : (
              <span className="font-medium text-ok-ink">Miễn phí</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-fg pt-3">
          <dt className="font-medium text-fg">Tổng</dt>
          <dd>
            <Price amount={order.total} size="xl" />
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-0.5 border-t border-border pt-4 text-sm">
        <span className="text-muted">Giao đến</span>
        <span className="font-medium text-fg">
          {order.shippingName} · <span className="tabular-nums">{order.phone}</span>
        </span>
        <span className="text-muted">{order.address}</span>
        {order.note && <span className="text-muted">Ghi chú: {order.note}</span>}
      </div>
    </div>
  );
}
