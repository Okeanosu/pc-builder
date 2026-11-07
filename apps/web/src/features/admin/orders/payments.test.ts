import type { AdminPaymentDTO } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { toQueryString } from '../api';
import { PAYMENT_FILTERS, paymentOrderLabel, paymentProviderLabel, paymentStatusMeta } from './payments';

const payment = (patch: Partial<AdminPaymentDTO> = {}): AdminPaymentDTO => ({
  id: 'p1',
  orderCode: 'PCB2611080001',
  provider: 'SEPAY',
  amount: 25_190_000,
  transferContent: 'PCB2611080001 thanh toan',
  providerTxnId: '9001',
  status: 'SUCCESS',
  createdAt: '2026-11-08T03:00:00.000Z',
  ...patch,
});

describe('paymentStatusMeta', () => {
  it('names every status the webhook stores, with a tone', () => {
    expect(paymentStatusMeta('SUCCESS')).toEqual({ label: 'Khớp', tone: 'ok' });
    expect(paymentStatusMeta('UNDERPAID')).toEqual({ label: 'Chuyển thiếu', tone: 'warn' });
    expect(paymentStatusMeta('MANUAL_REVIEW')).toEqual({ label: 'Cần đối soát', tone: 'warn' });
    expect(paymentStatusMeta('NO_ORDER')).toEqual({ label: 'Không khớp đơn', tone: 'danger' });
  });

  it('shows an unknown status as-is rather than hiding it', () => {
    expect(paymentStatusMeta('DUPLICATE')).toEqual({ label: 'Trùng giao dịch', tone: 'neutral' });
    expect(paymentStatusMeta('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'neutral' });
  });
});

describe('PAYMENT_FILTERS', () => {
  it('offers a chip per stored status, NO_ORDER included', () => {
    expect(PAYMENT_FILTERS).toEqual(['SUCCESS', 'UNDERPAID', 'NO_ORDER', 'MANUAL_REVIEW']);
  });

  it('builds the list query the API expects', () => {
    expect(toQueryString({ page: 1, pageSize: 20, status: 'NO_ORDER' })).toBe(
      '?page=1&pageSize=20&status=NO_ORDER',
    );
    expect(toQueryString({ page: 2, pageSize: 20, status: undefined })).toBe('?page=2&pageSize=20');
  });
});

describe('paymentOrderLabel', () => {
  it('uses the order code, or says the transfer matched no order', () => {
    expect(paymentOrderLabel(payment())).toEqual({ code: 'PCB2611080001', text: 'PCB2611080001' });
    expect(paymentOrderLabel(payment({ orderCode: null, status: 'NO_ORDER' }))).toEqual({
      code: null,
      text: 'Không khớp đơn',
    });
  });
});

describe('paymentProviderLabel', () => {
  it('names the source of the money', () => {
    expect(paymentProviderLabel('SEPAY')).toBe('SePay (webhook)');
    expect(paymentProviderLabel('SIMULATOR')).toBe('Giả lập');
    expect(paymentProviderLabel('MANUAL')).toBe('Xác nhận tay');
    expect(paymentProviderLabel('OTHER')).toBe('OTHER');
  });
});
