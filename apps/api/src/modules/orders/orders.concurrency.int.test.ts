import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CHECKOUT, createCommerceHarness } from '../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());
beforeEach(() => h.seed());

/** One supertest agent per buyer, so every request carries its own gid cookie and therefore its own guest cart. */
async function buyersWith(n: number, lines: { productId: string; qty: number }[][]) {
  const agents = Array.from({ length: n }, () => request.agent(h.app));
  for (const [i, agent] of agents.entries()) {
    for (const line of lines[i % lines.length]!) {
      const res = await agent.post('/api/cart/items').send(line);
      expect(res.status).toBe(201);
    }
  }
  return agents;
}

describe('anti-oversell: parallel checkout against the last units', () => {
  it('5 parallel orders for a product with stock 1 → exactly one 201 and four 409 OUT_OF_STOCK', async () => {
    const gpu = await h.product('gpu', { stock: 1, reserved: 0 });
    const agents = await buyersWith(5, [[{ productId: gpu.id, qty: 1 }]]);

    const results = await Promise.all(agents.map((a) => a.post('/api/orders').send(CHECKOUT)));

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    for (const r of results.filter((x) => x.status === 409)) {
      expect(r.body.error.code).toBe('OUT_OF_STOCK');
      expect(r.body.error.details).toMatchObject({ productId: gpu.id, name: gpu.name });
    }
    const after = await h.getProduct(gpu.id);
    expect(after.reserved).toBe(1);
    expect(after.stock).toBe(1);
  });

  it('N parallel orders for M < N units → exactly M succeed and reserved never exceeds stock', async () => {
    const ram = await h.product('ram', { stock: 3, reserved: 0 });
    const agents = await buyersWith(8, [[{ productId: ram.id, qty: 1 }]]);

    const results = await Promise.all(agents.map((a) => a.post('/api/orders').send(CHECKOUT)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    const after = await h.getProduct(ram.id);
    expect(after.reserved).toBe(3);
    expect(after.stock - after.reserved).toBe(0);
  });

  it('orders locking the same two products in opposite cart order neither deadlock nor oversell', async () => {
    const cpu = await h.product('cpu', { stock: 2, reserved: 0 });
    const mb = await h.product('mainboard', { stock: 2, reserved: 0 });
    const agents = await buyersWith(6, [
      [
        { productId: cpu.id, qty: 1 },
        { productId: mb.id, qty: 1 },
      ],
      [
        { productId: mb.id, qty: 1 },
        { productId: cpu.id, qty: 1 },
      ],
    ]);

    const results = await Promise.all(agents.map((a) => a.post('/api/orders').send(CHECKOUT)));

    expect(results.map((r) => r.status).filter((s) => s !== 201 && s !== 409)).toEqual([]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect((await h.getProduct(cpu.id)).reserved).toBe(2);
    expect((await h.getProduct(mb.id)).reserved).toBe(2);
  });
});
