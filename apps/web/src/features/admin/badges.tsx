import type { ChatMode, OrderStatus, OrderType, PaymentStatus, ProductStatus } from '@pc/shared';
import { Bot, CircleCheck, Clock, Eye, EyeOff, LifeBuoy, Truck, Wrench, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BadgeProps } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  CHAT_MODE_LABEL,
  CHAT_MODE_TONE,
  ORDER_STATUS_TONE,
  ORDER_TYPE_LABEL,
  orderStatusLabel,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from './format';

type Tone = NonNullable<BadgeProps['tone']>;

/** Status is told by ink colour (and an icon where it helps), never by a coloured frame or fill. */
const TONE_INK: Record<Tone, string> = {
  ok: 'text-ok-ink',
  warn: 'text-warn-ink',
  danger: 'text-danger-ink',
  accent: 'text-fg',
  solid: 'text-fg',
  outline: 'text-fg',
  neutral: 'text-muted',
};

export function StatusText({
  tone = 'neutral',
  size = 'md',
  className,
  children,
}: {
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium [&_svg]:shrink-0',
        size === 'sm' ? 'text-xs [&_svg]:size-3.5' : 'text-sm [&_svg]:size-4',
        TONE_INK[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_ICON: Record<OrderStatus, typeof Clock> = {
  PENDING_PAYMENT: Clock,
  PAID: CircleCheck,
  PROCESSING: Wrench,
  SHIPPING: Truck,
  COMPLETED: CircleCheck,
  CANCELLED: X,
};

export function OrderStatusBadge({ status, type }: { status: OrderStatus; type?: OrderType }) {
  const Icon = STATUS_ICON[status];
  return (
    <StatusText tone={ORDER_STATUS_TONE[status]}>
      <Icon aria-hidden />
      {orderStatusLabel(status, type)}
    </StatusText>
  );
}

export function OrderTypeBadge({ type }: { type: OrderType }) {
  return <span className="text-xs text-muted">{ORDER_TYPE_LABEL[type]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusText tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</StatusText>;
}

export function ChatModeBadge({ mode }: { mode: ChatMode }) {
  const Icon = mode === 'AI' ? Bot : LifeBuoy;
  return (
    <StatusText tone={CHAT_MODE_TONE[mode]}>
      <Icon aria-hidden />
      {CHAT_MODE_LABEL[mode]}
    </StatusText>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return status === 'ACTIVE' ? (
    <StatusText tone="ok">
      <Eye aria-hidden />
      Đang bán
    </StatusText>
  ) : (
    <StatusText tone="neutral">
      <EyeOff aria-hidden />
      Đã ẩn
    </StatusText>
  );
}
