import type { OrderStatus, OrderType, Role } from '@pc/shared';

/** Client mirror of the server's order state machine; the server re-checks every transition. */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface TransitionOption {
  to: OrderStatus;
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  /** Text of the in-page confirmation; null = act immediately. */
  confirm: string | null;
  allowed: boolean;
  /** Why the action is unavailable for this role. */
  reason?: string;
}

interface OrderLike {
  status: OrderStatus;
  type: OrderType;
}

function option(order: OrderLike, to: OrderStatus, role: Role): TransitionOption {
  const build = order.type === 'BUILD';
  switch (to) {
    case 'PAID':
      return {
        to,
        label: 'Xác nhận đã nhận tiền',
        variant: 'secondary',
        confirm:
          'Chỉ dùng khi đã đối chiếu sao kê ngân hàng mà VietQR chưa tự ghi nhận. Hàng đang giữ sẽ được trừ khỏi kho.',
        allowed: true,
      };
    case 'PROCESSING':
      return {
        to,
        label: build ? 'Bắt đầu lắp ráp' : 'Bắt đầu xử lý',
        variant: 'primary',
        confirm: null,
        allowed: true,
      };
    case 'SHIPPING':
      return { to, label: 'Giao cho vận chuyển', variant: 'primary', confirm: null, allowed: true };
    case 'COMPLETED':
      return { to, label: 'Xác nhận đã giao xong', variant: 'primary', confirm: null, allowed: true };
    case 'CANCELLED': {
      if (order.status === 'PAID') {
        const admin = role === 'ADMIN';
        return {
          to,
          label: 'Hủy và hoàn tiền',
          variant: 'danger',
          confirm:
            'Hàng sẽ được nhập lại kho và đơn chuyển sang "Cần hoàn tiền". Nhớ hoàn tiền cho khách thủ công.',
          allowed: admin,
          ...(admin
            ? {}
            : { reason: 'Chỉ quản trị viên được hủy đơn đã thanh toán vì cần hoàn tiền thủ công.' }),
        };
      }
      return {
        to,
        label: 'Hủy đơn',
        variant: 'danger',
        confirm: 'Hàng đang giữ cho đơn sẽ được nhả lại để khách khác mua.',
        allowed: true,
      };
    }
    default:
      return { to, label: to, variant: 'secondary', confirm: null, allowed: false };
  }
}

export function transitionOptions(order: OrderLike, role: Role): TransitionOption[] {
  return ORDER_TRANSITIONS[order.status].map((to) => option(order, to, role));
}

export type StepState = 'done' | 'current' | 'upcoming' | 'cancelled';

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: StepState;
  at: string | null;
}

const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

function stepLabel(status: OrderStatus, type: OrderType): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Đặt hàng';
    case 'PAID':
      return 'Thanh toán VietQR';
    case 'PROCESSING':
      return type === 'BUILD' ? 'Lắp ráp' : 'Xử lý';
    case 'SHIPPING':
      return 'Giao hàng';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
  }
}

/** Only creation and payment times are stored, so later steps show state without a timestamp. */
export function timelineSteps(
  order: OrderLike & { createdAt: string; paidAt: string | null },
): TimelineStep[] {
  const at = (s: OrderStatus) =>
    s === 'PENDING_PAYMENT' ? order.createdAt : s === 'PAID' ? order.paidAt : null;
  if (order.status === 'CANCELLED') {
    const reached: OrderStatus[] = order.paidAt ? ['PENDING_PAYMENT', 'PAID'] : ['PENDING_PAYMENT'];
    return [
      ...reached.map((s) => ({
        status: s,
        label: stepLabel(s, order.type),
        state: 'done' as const,
        at: at(s),
      })),
      { status: 'CANCELLED', label: stepLabel('CANCELLED', order.type), state: 'cancelled', at: null },
    ];
  }
  const current = FLOW.indexOf(order.status);
  return FLOW.map((s, i) => ({
    status: s,
    label: stepLabel(s, order.type),
    state:
      i < current || (s === 'COMPLETED' && i === current) ? 'done' : i === current ? 'current' : 'upcoming',
    at: at(s),
  }));
}
