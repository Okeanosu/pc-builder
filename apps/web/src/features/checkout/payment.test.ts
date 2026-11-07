import { describe, expect, it } from 'vitest';
import { bankName, isSettled, paymentPhase } from './payment';

describe('paymentPhase', () => {
  it('is pending while unpaid and time remains', () => {
    expect(paymentPhase({ status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' }, 60_000)).toBe('pending');
    expect(paymentPhase({ status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' }, null)).toBe('pending');
  });

  it('is expired once the countdown hits zero but the server has not cancelled yet', () => {
    expect(paymentPhase({ status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' }, 0)).toBe('expired');
  });

  it('is paid for any post-payment status, even past the deadline', () => {
    expect(paymentPhase({ status: 'PAID', paymentStatus: 'PAID' }, 0)).toBe('paid');
    expect(paymentPhase({ status: 'PROCESSING', paymentStatus: 'PAID' }, null)).toBe('paid');
    expect(paymentPhase({ status: 'SHIPPING', paymentStatus: 'UNPAID' }, null)).toBe('paid');
  });

  it('is cancelled when the server cancelled the order', () => {
    expect(paymentPhase({ status: 'CANCELLED', paymentStatus: 'UNPAID' }, 0)).toBe('cancelled');
  });

  it('stops polling only on settled phases', () => {
    expect(isSettled('paid')).toBe(true);
    expect(isSettled('cancelled')).toBe(true);
    expect(isSettled('expired')).toBe(false);
    expect(isSettled('pending')).toBe(false);
  });
});

describe('bankName', () => {
  it('names known BINs and falls back for others', () => {
    expect(bankName('970422')).toBe('MB Bank');
    expect(bankName('123456')).toBe('Ngân hàng (BIN 123456)');
  });
});
