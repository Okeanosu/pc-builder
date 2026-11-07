import type { InventoryAdjustInput, MovementReason } from '@pc/shared';

/** Same threshold the API uses for the dashboard counter and `lowStock=true`. */
export const LOW_STOCK = 3;

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(sellable: number): StockLevel {
  if (sellable <= 0) return 'out';
  if (sellable <= LOW_STOCK) return 'low';
  return 'ok';
}

export const MOVEMENT_LABEL: Record<MovementReason, string> = {
  IMPORT: 'Nhập kho',
  ORDER: 'Bán ra',
  CANCEL: 'Hoàn kho (hủy đơn)',
  ADJUST: 'Điều chỉnh',
};

export interface AdjustDraft {
  reason: InventoryAdjustInput['reason'];
  delta: string;
  note: string;
}

/**
 * Mirrors the API rules so the dialog can explain a refusal before sending:
 * non-zero integer, imports are positive, stock may not drop below units held for unpaid orders.
 */
export function checkAdjust(
  draft: AdjustDraft,
  current: { stockOnHand: number; reserved: number },
): { input: InventoryAdjustInput | null; error: string | null; after: number | null } {
  const text = draft.delta.trim().replace(/^\+/, '');
  if (text === '' || text === '-') return { input: null, error: null, after: null };
  if (!/^-?\d+$/.test(text)) return { input: null, error: 'Nhập số nguyên, ví dụ 10 hoặc -2', after: null };
  const delta = Number(text);
  const after = current.stockOnHand + delta;
  if (delta === 0) return { input: null, error: 'Số lượng thay đổi phải khác 0', after };
  if (draft.reason === 'IMPORT' && delta < 0) {
    return { input: null, error: 'Nhập kho phải là số dương; dùng "Điều chỉnh" để giảm', after };
  }
  if (after < 0) return { input: null, error: 'Tồn kho không thể âm', after };
  if (after < current.reserved) {
    return {
      input: null,
      error: `Không được thấp hơn ${current.reserved} sản phẩm đang giữ cho đơn chờ thanh toán`,
      after,
    };
  }
  const note = draft.note.trim();
  return { input: { delta, reason: draft.reason, ...(note ? { note } : {}) }, error: null, after };
}
