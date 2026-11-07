import { ORDER_STATUS_LABELS, type OrderDTO, type OrderItemDTO, type OrderStatus } from '@pc/shared';
import { Cpu } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<OrderStatus, BadgeProps['tone']> = {
  PENDING_PAYMENT: 'warn',
  PAID: 'ok',
  PROCESSING: 'accent',
  SHIPPING: 'accent',
  COMPLETED: 'ok',
  CANCELLED: 'danger',
};

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: BadgeProps['size'] }) {
  return (
    <Badge tone={STATUS_TONE[status]} size={size}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export const orderDate = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function ItemRows({ items }: { items: OrderItemDTO[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li
          key={`${i.productId}-${i.buildId ?? ''}`}
          className="flex items-baseline justify-between gap-3 text-sm"
        >
          <span className="min-w-0 text-fg">
            <span className="line-clamp-2">{i.name}</span>
            <span className="font-mono text-xs text-muted">
              {i.qty} × <Price amount={i.price} size="sm" tone="muted" className="text-xs" />
            </span>
          </span>
          <Price amount={i.price * i.qty} size="sm" className="shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Items (build parts grouped), totals and delivery details of one order. */
export function OrderSummary({ order, className }: { order: OrderDTO; className?: string }) {
  const buildItems = order.items.filter((i) => i.buildId);
  const retail = order.items.filter((i) => !i.buildId);
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {buildItems.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Cpu className="size-4 text-accent-ink" aria-hidden />
            {order.type === 'BUILD' ? 'Bộ PC lắp ráp sẵn' : 'Linh kiện theo cấu hình'}
          </span>
          <ItemRows items={buildItems} />
        </div>
      )}
      {retail.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {buildItems.length > 0 && <span className="text-sm font-semibold text-fg">Linh kiện lẻ</span>}
          <ItemRows items={retail} />
        </div>
      )}
      <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Tạm tính</dt>
          <dd>
            <Price amount={order.subtotal} size="sm" />
          </dd>
        </div>
        {order.assemblyFee > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Phí lắp ráp</dt>
            <dd>
              <Price amount={order.assemblyFee} size="sm" />
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Phí vận chuyển</dt>
          <dd>
            {order.shippingFee > 0 ? (
              <Price amount={order.shippingFee} size="sm" />
            ) : (
              <span className="font-medium text-ok-ink">Miễn phí</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
          <dt className="font-semibold text-fg">Tổng</dt>
          <dd>
            <Price amount={order.total} size="lg" />
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1 rounded-sm bg-surface-2 px-3 py-2.5 text-sm">
        <span className="font-semibold text-fg">
          {order.shippingName} · <span className="font-mono">{order.phone}</span>
        </span>
        <span className="text-muted">{order.address}</span>
        {order.note && <span className="text-muted">Ghi chú: {order.note}</span>}
      </div>
    </div>
  );
}
