import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inventoryMovements, orders, payments } from '../../db/schema';
import { expirePendingOrders } from '../../jobs/order-expiry';
import { CHECKOUT, createCommerceHarness } from '../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());
beforeEach(() => h.seed());

const apiKey = () => `Apikey ${h.deps.env.SEPAY_API_KEY}`;

let txnSeq = 90_000;
function sepayBody(code: string, amount: number, extra: Record<string, unknown> = {}) {
  txnSeq += 1;
  return {
    id: txnSeq,
    gateway: 'Vietcombank',
    transactionDate: '2026-11-07 14:02:37',
    accountNumber: h.deps.env.VIETQR_ACCOUNT_NO,
    code: null,
    content: `MBVCB.3278907687.${code}.CT tu 0123456789 toi ${h.deps.env.VIETQR_ACCOUNT_NO}`,
    transferType: 'in',
    transferAmount: amount,
    accumulated: 19_077_000,
    subAccount: null,
    referenceCode: 'MBVCB.3278907687',
    description: '',
    ...extra,
  };
}

async function placeOrder(qty = 2) {
  const gpu = await h.product('gpu', { stock: 5, reserved: 0 });
  const agent = request.agent(h.app);
  await agent.post('/api/cart/items').send({ productId: gpu.id, qty });
  const res = await agent.post('/api/orders').send(CHECKOUT);
  expect(res.status).toBe(201);
  return { agent, gpu, order: res.body as { code: string; total: number; id: string } };
}

const orderRow = async (code: string) =>
  (await h.deps.db.select().from(orders).where(eq(orders.code, code)))[0]!;

describe('POST /api/payments/webhook/sepay', () => {
  it('marks the order PAID, converts the hold into a sale and logs an ORDER movement', async () => {
    const { gpu, order } = await placeOrder(2);
    const body = sepayBody(order.code, order.total);

    const res = await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', apiKey())
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const row = await orderRow(order.code);
    expect(row).toMatchObject({ status: 'PAID', paymentStatus: 'PAID' });
    expect(row.paidAt).toBeInstanceOf(Date);
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 3, reserved: 0 });
    const moves = await h.deps.db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.ref, order.code));
    expect(moves).toMatchObject([{ productId: gpu.id, delta: -2, reason: 'ORDER' }]);
    const [pay] = await h.deps.db.select().from(payments).where(eq(payments.orderId, row.id));
    expect(pay).toMatchObject({
      provider: 'SEPAY',
      amount: order.total,
      providerTxnId: String(body.id),
      status: 'SUCCESS',
      transferContent: body.content,
    });
    expect(pay!.raw).toMatchObject({ id: body.id, referenceCode: 'MBVCB.3278907687' });
    expect(await h.deps.redis.exists(`hold:order:${order.code}`)).toBe(0);
  });

  it('is idempotent on provider_txn_id: a replayed webhook is a 200 no-op', async () => {
    const { gpu, order } = await placeOrder(1);
    const body = sepayBody(order.code, order.total);
    const send = () =>
      request(h.app).post('/api/payments/webhook/sepay').set('Authorization', apiKey()).send(body);

    expect((await send()).status).toBe(200);
    const replay = await send();
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual({ success: true });

    expect(await h.deps.db.select().from(payments)).toHaveLength(1);
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 4, reserved: 0 });
    expect(
      await h.deps.db.select().from(inventoryMovements).where(eq(inventoryMovements.ref, order.code)),
    ).toHaveLength(1);
  });

  it('records an underpayment without touching the order', async () => {
    const { gpu, order } = await placeOrder(1);
    const res = await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', apiKey())
      .send(sepayBody(order.code, order.total - 1));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await orderRow(order.code)).toMatchObject({ status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' });
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 5, reserved: 1 });
    expect(await h.deps.db.select().from(payments)).toMatchObject([{ status: 'UNDERPAID' }]);
  });

  it('rejects a missing or wrong Apikey with 401 and changes nothing', async () => {
    const { order } = await placeOrder(1);
    const body = sepayBody(order.code, order.total);
    const none = await request(h.app).post('/api/payments/webhook/sepay').send(body);
    expect(none.status).toBe(401);
    const wrong = await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', 'Apikey not-the-key')
      .send(body);
    expect(wrong.status).toBe(401);
    const bearer = await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', `Bearer ${h.deps.env.SEPAY_API_KEY}`)
      .send(body);
    expect(bearer.status).toBe(401);
    expect((await orderRow(order.code)).status).toBe('PENDING_PAYMENT');
    expect(await h.deps.db.select().from(payments)).toEqual([]);
  });

  it('acknowledges but ignores outgoing transfers, unknown codes and malformed bodies', async () => {
    const { order } = await placeOrder(1);
    const post = (body: unknown) =>
      request(h.app)
        .post('/api/payments/webhook/sepay')
        .set('Authorization', apiKey())
        .send(body as object);

    const out = await post(sepayBody(order.code, order.total, { transferType: 'out' }));
    const unknown = await post(sepayBody('PCBZZZZZZZZ', order.total));
    const noCode = await post(sepayBody('', order.total, { content: 'chuyen tien mua iphone' }));
    const malformed = await post({ hello: 'world' });

    for (const res of [out, unknown, noCode, malformed]) {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    }
    expect((await orderRow(order.code)).status).toBe('PENDING_PAYMENT');
    expect(await h.deps.db.select().from(payments)).toEqual([]);
  });

  it('keeps a late payment for an expired (cancelled) order for manual review', async () => {
    const { gpu, order } = await placeOrder(1);
    const later = new Date(Date.now() + (h.deps.env.ORDER_HOLD_MINUTES + 1) * 60_000);
    expect(await expirePendingOrders(h.deps, later)).toEqual([order.code]);

    const res = await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', apiKey())
      .send(sepayBody(order.code, order.total));
    expect(res.status).toBe(200);
    expect((await orderRow(order.code)).status).toBe('CANCELLED');
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 5, reserved: 0 });
    expect(await h.deps.db.select().from(payments)).toMatchObject([{ status: 'MANUAL_REVIEW' }]);
  });
});

describe('GET /api/orders/:code/payment', () => {
  it('returns the VietQR payment info to the buyer and tracks the status', async () => {
    const { agent, order } = await placeOrder(1);
    const env = h.deps.env;

    const res = await agent.get(`/api/orders/${order.code}/payment`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      orderCode: order.code,
      amount: order.total,
      bankBin: env.VIETQR_BANK_BIN,
      accountNo: env.VIETQR_ACCOUNT_NO,
      accountName: env.VIETQR_ACCOUNT_NAME,
      transferContent: order.code,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
    });
    expect(res.body.qrImageUrl).toBe(
      `https://img.vietqr.io/image/${env.VIETQR_BANK_BIN}-${env.VIETQR_ACCOUNT_NO}-compact2.png?amount=${order.total}&addInfo=${order.code}&accountName=${encodeURIComponent(env.VIETQR_ACCOUNT_NAME)}`,
    );
    expect(res.body.expiresAt).toEqual(expect.any(String));
    expect((await request(h.app).get(`/api/orders/${order.code}/payment`)).status).toBe(404);

    await request(h.app)
      .post('/api/payments/webhook/sepay')
      .set('Authorization', apiKey())
      .send(sepayBody(order.code, order.total));
    const paid = await agent.get(`/api/orders/${order.code}/payment`);
    expect(paid.body).toMatchObject({ status: 'PAID', paymentStatus: 'PAID' });
  });
});

describe('POST /api/payments/:orderCode/simulate', () => {
  it('pays the order through the webhook path outside production', async () => {
    const { gpu, order } = await placeOrder(1);
    const res = await request(h.app).post(`/api/payments/${order.code}/simulate`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ orderCode: order.code, status: 'PAID', paymentStatus: 'PAID' });
    expect(await h.getProduct(gpu.id)).toMatchObject({ stock: 4, reserved: 0 });
    expect(await h.deps.db.select().from(payments)).toMatchObject([
      { provider: 'SIMULATOR', status: 'SUCCESS' },
    ]);
  });

  it('in production only an ADMIN may simulate', async () => {
    const { order } = await placeOrder(1);
    const prod = h.appWith({ env: { ...h.deps.env, NODE_ENV: 'production' } });

    const anon = await request(prod).post(`/api/payments/${order.code}/simulate`);
    expect(anon.status).toBe(403);
    const staff = await h.tokenFor('STAFF');
    const asStaff = await request(prod)
      .post(`/api/payments/${order.code}/simulate`)
      .set('Authorization', `Bearer ${staff}`);
    expect(asStaff.status).toBe(403);
    expect((await orderRow(order.code)).status).toBe('PENDING_PAYMENT');

    const admin = await h.tokenFor('ADMIN');
    const asAdmin = await request(prod)
      .post(`/api/payments/${order.code}/simulate`)
      .set('Authorization', `Bearer ${admin}`);
    expect(asAdmin.status).toBe(200);
    expect((await orderRow(order.code)).status).toBe('PAID');
  });

  it('404s for an unknown order', async () => {
    const res = await request(h.app).post('/api/payments/PCBZZZZZZZZ/simulate');
    expect(res.status).toBe(404);
  });
});
