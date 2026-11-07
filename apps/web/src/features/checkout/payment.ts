import type { OrderStatus, PaymentInfoDTO, Role } from '@pc/shared';

/** Napas BINs of the banks most often configured for VietQR. */
const BANK_NAMES: Record<string, string> = {
  '970422': 'MB Bank',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970418': 'BIDV',
  '970405': 'Agribank',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970437': 'HDBank',
  '970441': 'VIB',
};

export const bankName = (bin: string) => BANK_NAMES[bin] ?? `Ngân hàng (BIN ${bin})`;

const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

export type PaymentPhase = 'pending' | 'expired' | 'paid' | 'cancelled';

/**
 * What the pay page should show. The server cancels unpaid orders a little after `expiresAt`,
 * so a pending order past its deadline is shown as expired while polling continues.
 */
export function paymentPhase(
  info: Pick<PaymentInfoDTO, 'status' | 'paymentStatus'>,
  remaining: number | null,
): PaymentPhase {
  if (info.paymentStatus === 'PAID' || PAID_STATUSES.includes(info.status)) return 'paid';
  if (info.status === 'CANCELLED') return 'cancelled';
  if (remaining === 0) return 'expired';
  return 'pending';
}

export const isSettled = (phase: PaymentPhase) => phase === 'paid' || phase === 'cancelled';

/**
 * Who sees the "Giả lập thanh toán" button: everyone in dev, admins in production (the API allows them),
 * and everyone in a production demo built with NEXT_PUBLIC_PAYMENT_SIMULATOR=1.
 */
export function paymentSimulator({
  nodeEnv,
  role,
  flag,
}: {
  nodeEnv: string | undefined;
  role: Role | undefined;
  flag: string | undefined;
}): { show: boolean; label: string } {
  if (nodeEnv !== 'production') return { show: true, label: 'Giả lập thanh toán (dev)' };
  return { show: role === 'ADMIN' || flag === '1', label: 'Giả lập thanh toán (demo)' };
}
