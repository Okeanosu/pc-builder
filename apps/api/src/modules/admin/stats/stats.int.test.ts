import { ORDER_STATUSES } from '@pc/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { chatSessions, orders } from '../../../db/schema';
import { createCommerceHarness } from '../../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());

let staff: string;
beforeEach(async () => {
  await h.seed();
  staff = `Bearer ${await h.tokenFor('STAFF')}`;
});

async function paidAt(code: string, iso: string, status?: 'PROCESSING' | 'COMPLETED') {
  await h.deps.db
    .update(orders)
    .set({ paidAt: new Date(iso), ...(status ? { status } : {}) })
    .where(eq(orders.code, code));
}

describe('GET /api/admin/stats/revenue', () => {
  async function fixture() {
    const cpu = await h.product('cpu', { price: 5_000_000, salePrice: null, stock: 20, reserved: 0 });
    const ram = await h.product('ram', { price: 1_000_000, salePrice: null, stock: 20, reserved: 0 });
    const a = await h.placeOrder([{ productId: cpu.id, qty: 1 }], { pay: true });
    const a2 = await h.placeOrder([{ productId: ram.id, qty: 2 }], { pay: true });
    const b = await h.placeOrder([{ productId: ram.id, qty: 1 }], { pay: true });
    const pending = await h.placeOrder([{ productId: cpu.id, qty: 1 }]);
    const refunded = await h.placeOrder([{ productId: cpu.id, qty: 2 }], { pay: true });
    await paidAt(a.code, '2026-11-01T03:00:00Z');
    await paidAt(a2.code, '2026-11-01T10:00:00Z', 'PROCESSING');
    // 01:30 on 3 Nov in Vietnam (UTC+7) although still 2 Nov in UTC.
    await paidAt(b.code, '2026-11-02T18:30:00Z', 'COMPLETED');
    await paidAt(refunded.code, '2026-11-01T05:00:00Z');
    await h.deps.db.update(orders).set({ status: 'CANCELLED' }).where(eq(orders.code, refunded.code));
    return { a, a2, b, pending };
  }

  it('sums PAID and later orders per Vietnam-local day, zero-filling empty days', async () => {
    const { a, a2, b } = await fixture();
    const res = await request(h.app)
      .get('/api/admin/stats/revenue?from=2026-11-01&to=2026-11-03&groupBy=day')
      .set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { period: '2026-11-01', revenue: a.total + a2.total, orders: 2 },
      { period: '2026-11-02', revenue: 0, orders: 0 },
      { period: '2026-11-03', revenue: b.total, orders: 1 },
    ]);
  });

  it('groups by Monday-based week and by month', async () => {
    const { a, a2, b } = await fixture();
    const weekly = await request(h.app)
      .get('/api/admin/stats/revenue?from=2026-11-01&to=2026-11-03&groupBy=week')
      .set('Authorization', staff);
    expect(weekly.body).toEqual([
      { period: '2026-10-26', revenue: a.total + a2.total, orders: 2 },
      { period: '2026-11-02', revenue: b.total, orders: 1 },
    ]);
    const monthly = await request(h.app)
      .get('/api/admin/stats/revenue?from=2026-10-01&to=2026-11-30&groupBy=month')
      .set('Authorization', staff);
    expect(monthly.body).toEqual([
      { period: '2026-10', revenue: 0, orders: 0 },
      { period: '2026-11', revenue: a.total + a2.total + b.total, orders: 3 },
    ]);
  });

  it('validates the range and grouping', async () => {
    const reversed = await request(h.app)
      .get('/api/admin/stats/revenue?from=2026-11-05&to=2026-11-01')
      .set('Authorization', staff);
    expect(reversed.status).toBe(422);
    const yearly = await request(h.app)
      .get('/api/admin/stats/revenue?groupBy=year')
      .set('Authorization', staff);
    expect(yearly.status).toBe(422);
    const defaults = await request(h.app).get('/api/admin/stats/revenue').set('Authorization', staff);
    expect(defaults.status).toBe(200);
    expect(defaults.body).toHaveLength(30);
  });
});

describe('GET /api/admin/stats/summary', () => {
  it('reports today’s revenue, orders by status, low-stock count and recent chat sessions', async () => {
    const cpu = await h.product('cpu', { stock: 20, reserved: 0 });
    const paid = await h.placeOrder([{ productId: cpu.id, qty: 1 }], { pay: true });
    await h.placeOrder([{ productId: cpu.id, qty: 1 }]);
    await h.deps.db.insert(chatSessions).values([
      { guestId: 'g1', title: 'Build gaming 25 triệu' },
      { guestId: 'g2', title: 'PC văn phòng' },
      { guestId: 'g3', title: 'Cũ', createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000) },
    ]);
    const [{ low }] = (await h.deps.db.execute(
      sql`SELECT count(*)::int AS low FROM products WHERE status = 'ACTIVE' AND stock - reserved <= 3`,
    )) as unknown as [{ low: number }];

    const res = await request(h.app).get('/api/admin/stats/summary').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todayRevenue: paid.total,
      todayOrders: 1,
      ordersByStatus: Object.fromEntries(
        ORDER_STATUSES.map((s) => [s, s === 'PAID' || s === 'PENDING_PAYMENT' ? 1 : 0]),
      ),
      lowStockCount: low,
      chatSessionsLast7Days: 2,
    });
    expect(low).toBeGreaterThan(0);
  });
});

describe('GET /api/admin/payments', () => {
  it('lists payments with their order codes for reconciliation', async () => {
    const cpu = await h.product('cpu', { stock: 20, reserved: 0 });
    const paid = await h.placeOrder([{ productId: cpu.id, qty: 1 }], { pay: true });
    const res = await request(h.app).get('/api/admin/payments').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: 1,
      items: [{ orderCode: paid.code, amount: paid.total, status: 'SUCCESS' }],
    });
  });
});
