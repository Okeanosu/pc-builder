import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { orderItems, orders } from '../../db/schema';
import { getCatalogVersion } from '../../lib/catalog-version';
import { CHECKOUT, createCommerceHarness } from '../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());
beforeEach(() => h.seed());

describe('POST /api/orders', () => {
  it('turns the guest cart into a RETAIL order that holds stock for ORDER_HOLD_MINUTES', async () => {
    const cpu = await h.product('cpu', { price: 5_000_000, salePrice: null, stock: 5, reserved: 0 });
    const ram = await h.product('ram', { price: 1_000_000, salePrice: 900_000, stock: 5, reserved: 1 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 1 });
    await agent.post('/api/cart/items').send({ productId: ram.id, qty: 2 });
    const versionBefore = await getCatalogVersion(h.deps.redis);

    const before = Date.now();
    const res = await agent.post('/api/orders').send({ ...CHECKOUT, note: 'Giao giờ hành chính' });

    expect(res.status).toBe(201);
    const order = res.body;
    expect(order.code).toMatch(/^PCB[A-Z2-7]{8}$/);
    expect(order).toMatchObject({
      type: 'RETAIL',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      subtotal: 6_800_000,
      assemblyFee: 0,
      shippingFee: 0,
      total: 6_800_000,
      shippingName: CHECKOUT.shippingName,
      note: 'Giao giờ hành chính',
      paidAt: null,
    });
    expect(order.items).toHaveLength(2);
    expect(order.items).toEqual(
      expect.arrayContaining([
        { productId: ram.id, name: ram.name, price: 900_000, qty: 2, buildId: null },
        { productId: cpu.id, name: cpu.name, price: 5_000_000, qty: 1, buildId: null },
      ]),
    );
    const holdMs = h.deps.env.ORDER_HOLD_MINUTES * 60_000;
    const expiresAt = new Date(order.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + holdMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + holdMs + 1000);

    expect((await h.getProduct(cpu.id)).reserved).toBe(1);
    expect((await h.getProduct(ram.id)).reserved).toBe(3);
    const ttl = await h.deps.redis.ttl(`hold:order:${order.code}`);
    expect(ttl).toBeGreaterThan(holdMs / 1000 - 5);
    expect(ttl).toBeLessThanOrEqual(holdMs / 1000);
    expect((await agent.get('/api/cart')).body.items).toEqual([]);
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(versionBefore);
  });

  it('BUILD orders take only that build’s lines and add ASSEMBLY_FEE', async () => {
    const cpu = await h.product('cpu', { price: 4_000_000, salePrice: null, stock: 5, reserved: 0 });
    const mb = await h.product('mainboard', { price: 3_000_000, salePrice: null, stock: 5, reserved: 0 });
    const ssd = await h.product('storage', { stock: 5, reserved: 0 });
    const buildId = await h.insertBuild([
      { category: 'cpu', id: cpu.id, name: cpu.name, price: cpu.price },
      { category: 'mainboard', id: mb.id, name: mb.name, price: mb.price },
    ]);
    const agent = request.agent(h.app);
    await agent.post(`/api/cart/builds/${buildId}`);
    await agent.post('/api/cart/items').send({ productId: ssd.id, qty: 1 });

    const res = await agent.post('/api/orders').send({ ...CHECKOUT, buildId });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'BUILD',
      subtotal: 7_000_000,
      assemblyFee: h.deps.env.ASSEMBLY_FEE,
      total: 7_000_000 + h.deps.env.ASSEMBLY_FEE,
    });
    expect(res.body.items.map((i: { buildId: string }) => i.buildId)).toEqual([buildId, buildId]);
    const [row] = await h.deps.db.select().from(orders).where(eq(orders.code, res.body.code));
    expect(row!.buildId).toBe(buildId);

    const cart = (await agent.get('/api/cart')).body;
    expect(cart.items.map((i: { product: { id: string } }) => i.product.id)).toEqual([ssd.id]);
  });

  it('prices from the database at order time, not from the cart', async () => {
    const gpu = await h.product('gpu', { price: 10_000_000, salePrice: null, stock: 5, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: gpu.id, qty: 1 });
    await h.product('gpu', { salePrice: 9_500_000 });

    const res = await agent.post('/api/orders').send(CHECKOUT);
    expect(res.body.total).toBe(9_500_000);
    const items = await h.deps.db.select().from(orderItems);
    expect(items[0]!.priceSnapshot).toBe(9_500_000);
  });

  it('rejects an empty cart, a build that is not in the cart, and invalid checkout data', async () => {
    const agent = request.agent(h.app);
    const empty = await agent.post('/api/orders').send(CHECKOUT);
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('EMPTY_CART');

    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 1 });
    const wrongBuild = await agent
      .post('/api/orders')
      .send({ ...CHECKOUT, buildId: '00000000-0000-4000-8000-000000000000' });
    expect(wrongBuild.status).toBe(400);
    expect(wrongBuild.body.error.code).toBe('EMPTY_CART');

    const invalid = await agent.post('/api/orders').send({ ...CHECKOUT, phone: '123' });
    expect(invalid.status).toBe(422);
  });

  it('reports OUT_OF_STOCK with the product name and rolls back every reservation of the order', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    const gpu = await h.product('gpu', { stock: 1, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 2 });
    await agent.post('/api/cart/items').send({ productId: gpu.id, qty: 1 });
    await h.product('gpu', { reserved: 1 });

    const res = await agent.post('/api/orders').send(CHECKOUT);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'OUT_OF_STOCK',
      details: { productId: gpu.id, name: gpu.name, requested: 1, available: 0 },
    });
    expect(res.body.error.message).toContain(gpu.name);
    expect((await h.getProduct(cpu.id)).reserved).toBe(0);
    expect(await h.deps.db.select().from(orders)).toEqual([]);
    expect((await agent.get('/api/cart')).body.items).toHaveLength(2);
  });
});

describe('reading and cancelling orders', () => {
  it('lets the guest who placed the order and staff read it; other visitors get 404', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 1 });
    const { code } = (await agent.post('/api/orders').send(CHECKOUT)).body;

    expect((await agent.get(`/api/orders/${code}`)).status).toBe(200);
    expect((await request(h.app).get(`/api/orders/${code}`)).status).toBe(404);
    const staff = await h.tokenFor('STAFF');
    const asStaff = await request(h.app).get(`/api/orders/${code}`).set('Authorization', `Bearer ${staff}`);
    expect(asStaff.status).toBe(200);
    expect(asStaff.body.code).toBe(code);
    expect((await request(h.app).get('/api/orders/PCBAAAAAAAA')).status).toBe(404);
  });

  it('lists the signed-in customer’s orders on /me/orders', async () => {
    const token = await h.tokenFor('CUSTOMER');
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    const auth = { Authorization: `Bearer ${token}` };
    await request(h.app).post('/api/cart/items').set(auth).send({ productId: cpu.id, qty: 1 });
    const created = await request(h.app).post('/api/orders').set(auth).send(CHECKOUT);
    expect(created.status).toBe(201);

    expect((await request(h.app).get('/api/me/orders')).status).toBe(401);
    const mine = await request(h.app).get('/api/me/orders').set(auth);
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ page: 1, total: 1 });
    expect(mine.body.items[0].code).toBe(created.body.code);
    expect((await request(h.app).get(`/api/orders/${created.body.code}`).set(auth)).status).toBe(200);
    expect((await request(h.app).get(`/api/orders/${created.body.code}`)).status).toBe(404);
  });

  it('cancels a pending order for its owner, releases the hold, and refuses a second cancel', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 2 });
    const { code } = (await agent.post('/api/orders').send(CHECKOUT)).body;
    expect((await h.getProduct(cpu.id)).reserved).toBe(2);

    expect((await request(h.app).post(`/api/orders/${code}/cancel`)).status).toBe(404);
    const res = await agent.post(`/api/orders/${code}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect((await h.getProduct(cpu.id)).reserved).toBe(0);
    expect(await h.deps.redis.exists(`hold:order:${code}`)).toBe(0);

    const again = await agent.post(`/api/orders/${code}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });
});
