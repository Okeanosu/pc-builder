import type { ORDER_STATUSES } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { ORDER_TRANSITIONS, timelineSteps, transitionOptions } from './order-state';

const order = (
  status: (typeof ORDER_STATUSES)[number],
  extra: Partial<Parameters<typeof timelineSteps>[0]> = {},
) => ({
  status,
  type: 'BUILD' as const,
  createdAt: '2026-11-07T07:00:00.000Z',
  paidAt: null as string | null,
  ...extra,
});

describe('ORDER_TRANSITIONS', () => {
  it('mirrors the server state machine', () => {
    expect(ORDER_TRANSITIONS).toEqual({
      PENDING_PAYMENT: ['PAID', 'CANCELLED'],
      PAID: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPING'],
      SHIPPING: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    });
  });
});

describe('transitionOptions', () => {
  it('offers only the legal next steps, forward step first', () => {
    expect(transitionOptions(order('PAID'), 'ADMIN').map((o) => o.to)).toEqual(['PROCESSING', 'CANCELLED']);
    expect(transitionOptions(order('PROCESSING'), 'STAFF').map((o) => o.to)).toEqual(['SHIPPING']);
    expect(transitionOptions(order('COMPLETED'), 'ADMIN')).toEqual([]);
    expect(transitionOptions(order('CANCELLED'), 'ADMIN')).toEqual([]);
  });

  it('names the processing step after the order type', () => {
    expect(transitionOptions(order('PAID'), 'ADMIN')[0]!.label).toBe('Bắt đầu lắp ráp');
    expect(transitionOptions(order('PAID', { type: 'RETAIL' }), 'ADMIN')[0]!.label).toBe('Bắt đầu xử lý');
  });

  it('lets only ADMIN cancel a paid order, and always asks to confirm a cancellation', () => {
    const staff = transitionOptions(order('PAID'), 'STAFF').find((o) => o.to === 'CANCELLED')!;
    expect(staff.allowed).toBe(false);
    expect(staff.reason).toContain('quản trị viên');
    const admin = transitionOptions(order('PAID'), 'ADMIN').find((o) => o.to === 'CANCELLED')!;
    expect(admin.allowed).toBe(true);
    expect(admin.confirm).toContain('hoàn tiền');
    const unpaid = transitionOptions(order('PENDING_PAYMENT'), 'STAFF').find((o) => o.to === 'CANCELLED')!;
    expect(unpaid.allowed).toBe(true);
    expect(unpaid.confirm).toBeTruthy();
  });

  it('lets only ADMIN confirm a payment by hand', () => {
    const staff = transitionOptions(order('PENDING_PAYMENT'), 'STAFF').find((o) => o.to === 'PAID')!;
    expect(staff.allowed).toBe(false);
    expect(staff.reason).toBe('Chỉ quản trị viên được xác nhận thanh toán thủ công');
    const admin = transitionOptions(order('PENDING_PAYMENT'), 'ADMIN').find((o) => o.to === 'PAID')!;
    expect(admin.allowed).toBe(true);
    expect(admin.reason).toBeUndefined();
    expect(admin.confirm).toContain('sao kê');
  });
});

describe('timelineSteps', () => {
  it('marks reached steps done and the current one as current', () => {
    const steps = timelineSteps(order('PROCESSING', { paidAt: '2026-11-07T07:05:00.000Z' }));
    expect(steps.map((s) => [s.status, s.state])).toEqual([
      ['PENDING_PAYMENT', 'done'],
      ['PAID', 'done'],
      ['PROCESSING', 'current'],
      ['SHIPPING', 'upcoming'],
      ['COMPLETED', 'upcoming'],
    ]);
    expect(steps[1]!.at).toBe('2026-11-07T07:05:00.000Z');
    expect(steps[2]!.label).toBe('Lắp ráp');
  });

  it('ends a cancelled order with a cancelled step after the last step it reached', () => {
    const unpaid = timelineSteps(order('CANCELLED'));
    expect(unpaid.map((s) => [s.status, s.state])).toEqual([
      ['PENDING_PAYMENT', 'done'],
      ['CANCELLED', 'cancelled'],
    ]);
    const paid = timelineSteps(order('CANCELLED', { paidAt: '2026-11-07T07:05:00.000Z' }));
    expect(paid.map((s) => s.status)).toEqual(['PENDING_PAYMENT', 'PAID', 'CANCELLED']);
  });
});
