import {
  type ChatMode,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type OrderType,
  type PaymentStatus,
} from '@pc/shared';
import type { BadgeProps } from '@/components/ui/Badge';

const TZ = 'Asia/Ho_Chi_Minh';

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "07/11/2026 14:05" in shop time, or "—". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateOnly.format(new Date(iso));
}

/** YYYY-MM-DD of `date` in shop time (what the stats API expects). */
export function shopDay(date: Date): string {
  return isoDay.format(date);
}

type Tone = NonNullable<BadgeProps['tone']>;

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: 'warn',
  PAID: 'accent',
  PROCESSING: 'accent',
  SHIPPING: 'accent',
  COMPLETED: 'ok',
  CANCELLED: 'neutral',
};

/** Retail orders are "processing"; build orders are physically assembled at that step. */
export function orderStatusLabel(status: OrderStatus, type?: OrderType): string {
  if (status === 'PROCESSING') return type === 'BUILD' ? 'Đang lắp ráp' : 'Đang xử lý';
  return ORDER_STATUS_LABELS[status];
}

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  RETAIL: 'Mua lẻ',
  BUILD: 'Nguyên bộ',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Cần hoàn tiền',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  UNPAID: 'neutral',
  PAID: 'ok',
  REFUNDED: 'warn',
};

export const CHAT_MODE_LABEL: Record<ChatMode, string> = {
  AI: 'AI (Gemini)',
  FALLBACK: 'Dự phòng',
};

export const CHAT_MODE_TONE: Record<ChatMode, Tone> = {
  AI: 'accent',
  FALLBACK: 'warn',
};

/** Two decimals with a comma, the way weights are read aloud in Vietnamese: 0.42 → "0,42". */
export function formatWeight(n: number): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
