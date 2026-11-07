import type { ChatMode, OrderStatus, OrderType, PaymentStatus, ProductStatus } from '@pc/shared';
import { Bot, CircleCheck, Clock, Eye, EyeOff, LifeBuoy, Truck, Wrench, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  CHAT_MODE_LABEL,
  CHAT_MODE_TONE,
  ORDER_STATUS_TONE,
  ORDER_TYPE_LABEL,
  orderStatusLabel,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from './format';

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
    <Badge tone={ORDER_STATUS_TONE[status]}>
      <Icon aria-hidden />
      {orderStatusLabel(status, type)}
    </Badge>
  );
}

export function OrderTypeBadge({ type }: { type: OrderType }) {
  return <Badge tone={type === 'BUILD' ? 'outline' : 'neutral'}>{ORDER_TYPE_LABEL[type]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

export function ChatModeBadge({ mode }: { mode: ChatMode }) {
  const Icon = mode === 'AI' ? Bot : LifeBuoy;
  return (
    <Badge tone={CHAT_MODE_TONE[mode]}>
      <Icon aria-hidden />
      {CHAT_MODE_LABEL[mode]}
    </Badge>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return status === 'ACTIVE' ? (
    <Badge tone="ok">
      <Eye aria-hidden />
      Đang bán
    </Badge>
  ) : (
    <Badge tone="neutral">
      <EyeOff aria-hidden />
      Đã ẩn
    </Badge>
  );
}
