import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inventoryMovements } from '../../../db/schema';
import { createCommerceHarness } from '../../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());

let staff: string;
let admin: string;
beforeEach(async () => {
  await h.seed();
  staff = `Bearer ${await h.tokenFor('STAFF')}`;
  admin = `Bearer ${await h.tokenFor('ADMIN')}`;
});

const setStatus = (code: string, status: string, auth = staff) =>
  request(h.app).patch(`/api/admin/orders/${code}/status`).set('Authorization', auth).send({ status });

describe('GET /api/admin/orders', () => {
  it('filters by status and searches by code', async () => {
    const cpu = await h.product('cpu', { stock: 10, reserved: 0 });
    const pending = await h.placeOrder([{ productId: cpu.id, qty: 1 }]);
    const paid = await h.placeOrder([{ productId: cpu.id, qty: 1 }], { pay: true });

    const all = await request(h.app).get('/api/admin/orders').set('Authorization', staff);
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(2);

    const onlyPaid = await request(h.app).get('/api/admin/orders?status=PAID').set('Authorization', staff);
    expect(onlyPaid.body.items.map((o: { code: string }) => o.code)).toEqual([paid.code]);

    const byCode = await request(h.app)
      .get(`/api/admin/orders?q=${pending.code.slice(3, 9).toLowerCase()}`)
      .set('Authorization', staff);
    expect(byCode.body.items.map((o: { code: string }) => o.code)).toEqual([pending.code]);
  });

  it('shows an order with its payments', async () => {
    const cpu = await h.product('cpu', { stock: 10, reserved: 0 });
    const paid = await h.placeOrder([{ productId: cpu.id, qty: 1 }], { pay: true });
    const res = await request(h.app).get(`/api/admin/orders/${paid.code}`).set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: paid.code, status: 'PAID', userEmail: null });
    expect(res.body.payments).toMatchObject([
      { orderCode: paid.code, status: 'SUCCESS', provider: 'SIMULATOR' },
    ]);
  });
});

describe('PATCH /api/admin/orders/:code/status', () => {
  it('walks a paid order through PROCESSING → SHIPPING → COMPLETED', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 0 });
    const { code } = await h.placeOrder([{ productId: gpu.id, qty: 1 }], { pay: true });
    for (const status of ['PROCESSING', 'SHIPPING', 'COMPLETED']) {
      const res = await setStatus(code, status);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 2, reserved: 0 });
  });

  it('rejects transitions outside the state machine with 409 INVALID_TRANSITION', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 0 });
    const { code } = await h.placeOrder([{ productId: gpu.id, qty: 1 }]);
    const skip = await setStatus(code, 'SHIPPING');
    expect(skip.status).toBe(409);
    expect(skip.body.error).toMatchObject({
      code: 'INVALID_TRANSITION',
      details: { from: 'PENDING_PAYMENT', to: 'SHIPPING' },
    });
    expect((await setStatus(code, 'BOGUS')).status).toBe(422);
    expect((await setStatus('PCBZZZZZZZZ', 'PAID')).status).toBe(404);
  });

  it('cancelling an unpaid order releases the hold', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 0 });
    const { code } = await h.placeOrder([{ productId: gpu.id, qty: 2 }]);
    const res = await setStatus(code, 'CANCELLED');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CANCELLED', paymentStatus: 'UNPAID' });
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 3, reserved: 0 });
  });

  it('cancelling a paid order is ADMIN only, restocks and marks the payment REFUNDED', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 0 });
    const { code } = await h.placeOrder([{ productId: gpu.id, qty: 2 }], { pay: true });
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 1, reserved: 0 });

    const asStaff = await setStatus(code, 'CANCELLED');
    expect(asStaff.status).toBe(403);

    const res = await setStatus(code, 'CANCELLED', admin);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 3, reserved: 0 });
    const moves = await h.deps.db.select().from(inventoryMovements).where(eq(inventoryMovements.ref, code));
    expect(moves.map((m) => [m.reason, m.delta]).sort()).toEqual([
      ['CANCEL', 2],
      ['ORDER', -2],
    ]);
    expect(moves.find((m) => m.reason === 'CANCEL')!.actorId).toBe(await h.userId('ADMIN'));
  });
});
