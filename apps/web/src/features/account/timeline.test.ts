import { describe, expect, it } from 'vitest';
import { timelineSteps } from './timeline';

const base = { type: 'RETAIL' as const, createdAt: '2026-11-07T10:00:00Z', paidAt: null };
const states = (o: Parameters<typeof timelineSteps>[0]) => timelineSteps(o).map((s) => s.state);

describe('timelineSteps', () => {
  it('marks the pending step as current with the placement time', () => {
    const steps = timelineSteps({ ...base, status: 'PENDING_PAYMENT' });
    expect(steps.map((s) => s.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(steps[0]?.at).toBe(base.createdAt);
  });

  it('marks earlier steps done after payment and carries paidAt', () => {
    const steps = timelineSteps({ ...base, status: 'PAID', paidAt: '2026-11-07T10:05:00Z' });
    expect(steps.map((s) => s.state)).toEqual(['done', 'current', 'upcoming', 'upcoming', 'upcoming']);
    expect(steps[1]?.at).toBe('2026-11-07T10:05:00Z');
  });

  it('labels processing as assembly for build orders', () => {
    const steps = timelineSteps({ ...base, type: 'BUILD', status: 'PROCESSING', paidAt: 'x' });
    expect(steps[2]).toMatchObject({ label: 'Đang lắp ráp và kiểm tra', state: 'current' });
  });

  it('shows a completed order fully done', () => {
    expect(states({ ...base, status: 'COMPLETED', paidAt: 'x' })).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
    ]);
  });

  it('ends a cancelled order at "Đã hủy", after payment if it was paid', () => {
    expect(timelineSteps({ ...base, status: 'CANCELLED' }).map((s) => [s.key, s.state])).toEqual([
      ['PENDING_PAYMENT', 'done'],
      ['CANCELLED', 'cancelled'],
    ]);
    expect(states({ ...base, status: 'CANCELLED', paidAt: 'x' })).toEqual(['done', 'done', 'cancelled']);
  });
});
