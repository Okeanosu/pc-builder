import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { orders } from '../db/schema';
import { CHECKOUT, createCommerceHarness } from '../modules/cart/test-support';
import { expirePendingOrders, startOrderExpiryJob } from './order-expiry';

const h = createCommerceHarness();
afterAll(() => h.close());
beforeEach(() => h.seed());

async function placeOrder(productId: string, qty: number) {
  const agent = request.agent(h.app);
  await agent.post('/api/cart/items').send({ productId, qty });
  const res = await agent.post('/api/orders').send(CHECKOUT);
  expect(res.status).toBe(201);
  return res.body.code as string;
}

const statusOf = async (code: string) =>
  (await h.deps.db.select({ s: orders.status }).from(orders).where(eq(orders.code, code)))[0]!.s;

describe('order expiry job', () => {
  it('cancels PENDING_PAYMENT orders past expires_at and releases their reservation', async () => {
    const gpu = await h.product('gpu', { stock: 2, reserved: 0 });
    const code = await placeOrder(gpu.id, 2);
    expect((await h.getProduct(gpu.id)).reserved).toBe(2);

    const early = await expirePendingOrders(h.deps, new Date(Date.now() + 60_000));
    expect(early).toEqual([]);
    expect(await statusOf(code)).toBe('PENDING_PAYMENT');

    const later = new Date(Date.now() + (h.deps.env.ORDER_HOLD_MINUTES + 1) * 60_000);
    expect(await expirePendingOrders(h.deps, later)).toEqual([code]);
    expect(await statusOf(code)).toBe('CANCELLED');
    const after = await h.getProduct(gpu.id);
    expect(after).toMatchObject({ stock: 2, reserved: 0 });
    expect(await h.deps.redis.exists(`hold:order:${code}`)).toBe(0);

    expect(await expirePendingOrders(h.deps, later)).toEqual([]);
    expect((await h.getProduct(gpu.id)).reserved).toBe(0);
  });

  it('leaves an order alone once its payment has landed', async () => {
    const cpu = await h.product('cpu', { stock: 3, reserved: 0 });
    const code = await placeOrder(cpu.id, 1);
    await h.deps.db.update(orders).set({ status: 'PAID' }).where(eq(orders.code, code));

    const later = new Date(Date.now() + (h.deps.env.ORDER_HOLD_MINUTES + 1) * 60_000);
    expect(await expirePendingOrders(h.deps, later)).toEqual([]);
    expect(await statusOf(code)).toBe('PAID');
    expect((await h.getProduct(cpu.id)).reserved).toBe(1);
  });

  it('runs on an interval until stopped', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const cpu = await h.product('cpu', { stock: 3, reserved: 0 });
      const code = await placeOrder(cpu.id, 1);
      await h.deps.db
        .update(orders)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(orders.code, code));
      const job = startOrderExpiryJob(h.deps, 60_000);
      await vi.advanceTimersByTimeAsync(60_000);
      await vi.waitFor(async () => expect(await statusOf(code)).toBe('CANCELLED'), { timeout: 5000 });
      job.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
