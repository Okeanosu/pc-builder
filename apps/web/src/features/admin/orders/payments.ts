import type { AdminPaymentDTO } from '@pc/shared';
import type { BadgeProps } from '@/components/ui/Badge';

type Tone = NonNullable<BadgeProps['tone']>;

/** Statuses the transfer webhook stores; each gets a filter chip on the reconciliation page. */
export const PAYMENT_FILTERS = ['SUCCESS', 'UNDERPAID', 'NO_ORDER', 'MANUAL_REVIEW'] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  SUCCESS: { label: 'Khớp', tone: 'ok' },
  UNDERPAID: { label: 'Chuyển thiếu', tone: 'warn' },
  MANUAL_REVIEW: { label: 'Cần đối soát', tone: 'warn' },
  NO_ORDER: { label: 'Không khớp đơn', tone: 'danger' },
  DUPLICATE: { label: 'Trùng giao dịch', tone: 'neutral' },
};

export function paymentStatusMeta(status: string): { label: string; tone: Tone } {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}

const PROVIDER_LABEL: Record<string, string> = {
  SEPAY: 'SePay (webhook)',
  SIMULATOR: 'Giả lập',
  MANUAL: 'Xác nhận tay',
};

export const paymentProviderLabel = (provider: string) => PROVIDER_LABEL[provider] ?? provider;

/** A transfer whose content named no known order has no code; say so instead of leaving the cell blank. */
export function paymentOrderLabel(p: Pick<AdminPaymentDTO, 'orderCode'>): {
  code: string | null;
  text: string;
} {
  return p.orderCode ? { code: p.orderCode, text: p.orderCode } : { code: null, text: 'Không khớp đơn' };
}
