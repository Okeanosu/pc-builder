import type { OrderStatus, OrderType } from '@pc/shared';

export type StepState = 'done' | 'current' | 'upcoming' | 'cancelled';

export interface TimelineStep {
  key: string;
  label: string;
  state: StepState;
  /** ISO time when known (placed, paid). */
  at?: string | null;
}

const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

function labelFor(status: OrderStatus, type: OrderType): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Đặt hàng, chờ thanh toán';
    case 'PAID':
      return 'Đã thanh toán';
    case 'PROCESSING':
      return type === 'BUILD' ? 'Đang lắp ráp và kiểm tra' : 'Đang chuẩn bị hàng';
    case 'SHIPPING':
      return 'Đang giao hàng';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
  }
}

interface OrderLike {
  status: OrderStatus;
  type: OrderType;
  createdAt: string;
  paidAt: string | null;
}

/** Steps of the order lifecycle with the current one marked; a cancelled order ends at "Đã hủy". */
export function timelineSteps(order: OrderLike): TimelineStep[] {
  const at = (s: OrderStatus) =>
    s === 'PENDING_PAYMENT' ? order.createdAt : s === 'PAID' ? order.paidAt : null;
  if (order.status === 'CANCELLED') {
    const reached = order.paidAt ? FLOW.slice(0, 2) : FLOW.slice(0, 1);
    return [
      ...reached.map((s) => ({ key: s, label: labelFor(s, order.type), state: 'done' as const, at: at(s) })),
      { key: 'CANCELLED', label: labelFor('CANCELLED', order.type), state: 'cancelled' },
    ];
  }
  const current = FLOW.indexOf(order.status);
  return FLOW.map((s, i) => ({
    key: s,
    label: labelFor(s, order.type),
    state:
      i < current || (s === 'COMPLETED' && i === current) ? 'done' : i === current ? 'current' : 'upcoming',
    at: at(s),
  }));
}
