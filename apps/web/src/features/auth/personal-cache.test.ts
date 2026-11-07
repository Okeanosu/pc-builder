import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../../lib/query-keys';
import { dropPersonalQueries, sessionEnded } from './personal-cache';

describe('dropPersonalQueries', () => {
  it('removes orders, builds, order details and payments but keeps public data and the cart', () => {
    const qc = new QueryClient();
    qc.setQueryData([...queryKeys.myOrders, 1, 10], { items: [] });
    qc.setQueryData(queryKeys.myBuilds, []);
    qc.setQueryData(queryKeys.order('PCB1'), { code: 'PCB1' });
    qc.setQueryData(queryKeys.payment('PCB1'), { orderCode: 'PCB1' });
    qc.setQueryData(queryKeys.cart, { items: [] });
    qc.setQueryData(queryKeys.categories, []);

    dropPersonalQueries(qc);

    const left = qc
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey[0]);
    expect(left.sort()).toEqual(['cart', 'categories']);
  });
});

describe('sessionEnded', () => {
  it('fires only when a signed-in user becomes null', () => {
    expect(sessionEnded({ user: { id: 'u1' } }, { user: null })).toBe(true);
    expect(sessionEnded({ user: null }, { user: null })).toBe(false);
    expect(sessionEnded({ user: null }, { user: { id: 'u1' } })).toBe(false);
    expect(sessionEnded({ user: { id: 'u1' } }, { user: { id: 'u2' } })).toBe(false);
  });
});
