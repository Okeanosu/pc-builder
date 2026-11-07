import { ORDER_STATUSES, type OrderStatus } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/errors';
import { assertTransition, canTransition, inventoryEffect, ORDER_TRANSITIONS } from './orders.state';

const LEGAL: [OrderStatus, OrderStatus][] = [
  ['PENDING_PAYMENT', 'PAID'],
  ['PENDING_PAYMENT', 'CANCELLED'],
  ['PAID', 'PROCESSING'],
  ['PAID', 'CANCELLED'],
  ['PROCESSING', 'SHIPPING'],
  ['SHIPPING', 'COMPLETED'],
];
const isLegal = (from: OrderStatus, to: OrderStatus) => LEGAL.some(([f, t]) => f === from && t === to);
const ALL_PAIRS = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const));

describe('order state machine', () => {
  it('declares exactly the lifecycle transitions', () => {
    const declared = Object.entries(ORDER_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => [from, to]));
    expect(declared.sort()).toEqual([...LEGAL].sort());
  });

  it.each(ALL_PAIRS)('%s -> %s is allowed only when it is a lifecycle edge', (from, to) => {
    expect(canTransition(from, to)).toBe(isLegal(from, to));
  });

  it.each(ALL_PAIRS.filter(([f, t]) => !isLegal(f, t)))(
    '%s -> %s throws 409 INVALID_TRANSITION',
    (from, to) => {
      let caught: unknown;
      try {
        assertTransition(from, to);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AppError);
      expect(caught).toMatchObject({ status: 409, code: 'INVALID_TRANSITION', details: { from, to } });
    },
  );

  it.each(LEGAL)('%s -> %s does not throw', (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('terminal states have no exits', () => {
    expect(ORDER_TRANSITIONS.COMPLETED).toEqual([]);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('maps each edge to its inventory side effect', () => {
    expect(inventoryEffect('PENDING_PAYMENT', 'CANCELLED')).toBe('RELEASE');
    expect(inventoryEffect('PENDING_PAYMENT', 'PAID')).toBe('COMMIT');
    expect(inventoryEffect('PAID', 'CANCELLED')).toBe('RESTOCK');
    expect(inventoryEffect('PAID', 'PROCESSING')).toBe('NONE');
    expect(inventoryEffect('PROCESSING', 'SHIPPING')).toBe('NONE');
    expect(inventoryEffect('SHIPPING', 'COMPLETED')).toBe('NONE');
  });
});
