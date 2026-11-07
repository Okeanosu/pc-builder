import { type CheckoutInput, checkoutSchema } from '@pc/shared';
import { type FieldMessages, fieldErrors } from '../auth/form-errors';

export const CHECKOUT_MESSAGES: FieldMessages = {
  shippingName: {
    too_small: 'Vui lòng nhập họ tên người nhận (ít nhất 2 ký tự)',
    too_big: 'Họ tên tối đa 100 ký tự',
    default: 'Vui lòng nhập họ tên người nhận',
  },
  phone: { default: 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0, ví dụ 0912345678' },
  address: {
    too_small: 'Địa chỉ cần ít nhất 10 ký tự: số nhà, đường, phường/xã, tỉnh/thành',
    too_big: 'Địa chỉ tối đa 300 ký tự',
    default: 'Vui lòng nhập địa chỉ giao hàng',
  },
  note: { too_big: 'Ghi chú tối đa 500 ký tự', default: 'Ghi chú chưa hợp lệ' },
};

export interface CheckoutFormValues {
  shippingName: string;
  phone: string;
  address: string;
  note: string;
}

export type CheckoutResult =
  | { ok: true; data: CheckoutInput }
  | { ok: false; errors: Partial<Record<keyof CheckoutFormValues, string>> };

/** Validates the form with the shared schema; an empty note is sent as "no note". */
export function validateCheckout(values: CheckoutFormValues, buildId?: string | null): CheckoutResult {
  const parsed = checkoutSchema.safeParse({
    shippingName: values.shippingName,
    phone: values.phone.replace(/[\s.-]/g, ''),
    address: values.address,
    note: values.note.trim() ? values.note : undefined,
    buildId: buildId ?? undefined,
  });
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: fieldErrors(parsed.error.issues, CHECKOUT_MESSAGES) };
}
