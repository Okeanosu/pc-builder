import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createCommerceHarness, guestIdFrom } from '../../../test/test-support';
import { cartItems, carts, products } from '../../db/schema';

const h = createCommerceHarness();
afterAll(() => h.close());
beforeEach(() => h.seed());

describe('guest cart (Redis)', () => {
  it('starts empty and issues a gid cookie', async () => {
    const res = await request(h.app).get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], subtotal: 0, itemCount: 0 });
    expect(guestIdFrom(res.headers['set-cookie'])).toHaveLength(21);
  });

  it('adds a line priced at the effective (sale) price and stores it under cart:guest:{gid}', async () => {
    const cpu = await h.product('cpu', { price: 5_000_000, salePrice: 4_500_000, stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    const first = await agent.get('/api/cart');
    const gid = guestIdFrom(first.headers['set-cookie']);

    const res = await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 2 });
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ qty: 2, buildId: null, lineTotal: 9_000_000 });
    expect(res.body.items[0].product.id).toBe(cpu.id);
    expect(res.body).toMatchObject({ subtotal: 9_000_000, itemCount: 2 });

    const key = `cart:guest:${gid}`;
    expect(await h.deps.redis.hgetall(key)).toEqual({ [`${cpu.id}:-`]: '2' });
    const ttl = await h.deps.redis.ttl(key);
    expect(ttl).toBeGreaterThan(6 * 24 * 3600);
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 3600);
  });

  it('sums quantities when the same product is added again', async () => {
    const cpu = await h.product('cpu', { stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 1 });
    const res = await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 2 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].qty).toBe(3);
  });

  it('rejects quantities above available stock (stock - reserved) with 409 INSUFFICIENT_STOCK', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 2 });
    const agent = request.agent(h.app);
    const res = await agent.post('/api/cart/items').send({ productId: gpu.id, qty: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details).toMatchObject({ productId: gpu.id, available: 1 });
  });

  it('returns 404 for unknown products and 422 for invalid quantities', async () => {
    const agent = request.agent(h.app);
    const missing = await agent
      .post('/api/cart/items')
      .send({ productId: '00000000-0000-4000-8000-000000000000', qty: 1 });
    expect(missing.status).toBe(404);
    const garbage = await agent.post('/api/cart/items').send({ productId: 'not-a-uuid', qty: 1 });
    expect(garbage.status).toBe(404);
    const cpu = await h.product('cpu');
    const tooMany = await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 21 });
    expect(tooMany.status).toBe(422);
  });

  it('updates and removes a line by its id', async () => {
    const ram = await h.product('ram', { stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    const added = await agent.post('/api/cart/items').send({ productId: ram.id, qty: 1 });
    const itemId = added.body.items[0].id as string;

    const patched = await agent.patch(`/api/cart/items/${encodeURIComponent(itemId)}`).send({ qty: 4 });
    expect(patched.status).toBe(200);
    expect(patched.body.items[0].qty).toBe(4);

    const over = await agent.patch(`/api/cart/items/${encodeURIComponent(itemId)}`).send({ qty: 11 });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('INSUFFICIENT_STOCK');

    const removed = await agent.delete(`/api/cart/items/${encodeURIComponent(itemId)}`);
    expect(removed.status).toBe(200);
    expect(removed.body.items).toEqual([]);

    const gone = await agent.delete(`/api/cart/items/${encodeURIComponent(itemId)}`);
    expect(gone.status).toBe(404);
  });

  it('adds every part of a stored build tagged with its build id, without duplicating on re-add', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    const mb = await h.product('mainboard', { stock: 5, reserved: 0 });
    const buildId = await h.insertBuild([
      { category: 'cpu', id: cpu.id, name: cpu.name, price: cpu.price },
      { category: 'mainboard', id: mb.id, name: mb.name, price: mb.price },
    ]);
    const agent = request.agent(h.app);
    const res = await agent.post(`/api/cart/builds/${buildId}`);
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(2);
    for (const item of res.body.items) expect(item).toMatchObject({ buildId, qty: 1 });

    const again = await agent.post(`/api/cart/builds/${buildId}`);
    expect(again.body.items).toHaveLength(2);
    expect(again.body.itemCount).toBe(2);
  });

  it('refuses a build whose part is out of stock and 404s unknown builds', async () => {
    const cpu = await h.product('cpu', { stock: 1, reserved: 1 });
    const buildId = await h.insertBuild([{ category: 'cpu', id: cpu.id, name: cpu.name, price: cpu.price }]);
    const agent = request.agent(h.app);
    const res = await agent.post(`/api/cart/builds/${buildId}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect((await agent.get('/api/cart')).body.items).toEqual([]);

    const missing = await agent.post('/api/cart/builds/00000000-0000-4000-8000-000000000000');
    expect(missing.status).toBe(404);
  });
});

describe('user cart (DB) and merge on login', () => {
  it('keeps an authenticated cart in carts/cart_items', async () => {
    const token = await h.tokenFor('CUSTOMER');
    const userId = await h.userId('CUSTOMER');
    const ssd = await h.product('storage', { stock: 10, reserved: 0 });
    const res = await request(h.app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: ssd.id, qty: 2 });
    expect(res.status).toBe(201);
    const [cart] = await h.deps.db.select().from(carts).where(eq(carts.userId, userId));
    const rows = await h.deps.db.select().from(cartItems).where(eq(cartItems.cartId, cart!.id));
    expect(rows).toMatchObject([{ productId: ssd.id, qty: 2, buildId: null }]);
    expect(res.body.items[0].id).toBe(rows[0]!.id);
  });

  it('merges the guest cart into the user cart on the first authenticated request (qty summed, capped at 20)', async () => {
    const token = await h.tokenFor('CUSTOMER');
    const userId = await h.userId('CUSTOMER');
    const psu = await h.product('psu', { stock: 50, reserved: 0 });
    const cooler = await h.product('cooler', { stock: 50, reserved: 0 });

    await request(h.app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: psu.id, qty: 15 });

    const agent = request.agent(h.app);
    const first = await agent.post('/api/cart/items').send({ productId: psu.id, qty: 10 });
    const gid = guestIdFrom(first.headers['set-cookie']);
    await agent.post('/api/cart/items').send({ productId: cooler.id, qty: 1 });

    const merged = await agent.get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(merged.status).toBe(200);
    const byProduct = Object.fromEntries(
      merged.body.items.map((i: { product: { id: string }; qty: number }) => [i.product.id, i.qty]),
    );
    expect(byProduct).toEqual({ [psu.id]: 20, [cooler.id]: 1 });
    expect(await h.deps.redis.exists(`cart:guest:${gid}`)).toBe(0);

    const [cart] = await h.deps.db.select().from(carts).where(eq(carts.userId, userId));
    const psuRows = await h.deps.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart!.id), eq(cartItems.productId, psu.id)));
    expect(psuRows).toHaveLength(1);

    const guestAfter = await agent.get('/api/cart');
    expect(guestAfter.body.items).toEqual([]);
  });
});

describe('atomic cart writes under concurrency', () => {
  it('parallel adds to a guest cart never lose an increment', async () => {
    const ram = await h.product('ram', { stock: 50, reserved: 0 });
    const agent = request.agent(h.app);
    const gid = guestIdFrom((await agent.get('/api/cart')).headers['set-cookie']);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => agent.post('/api/cart/items').send({ productId: ram.id, qty: 1 })),
    );

    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    expect(await h.deps.redis.hgetall(`cart:guest:${gid}`)).toEqual({ [`${ram.id}:-`]: '5' });
  });

  it('parallel adds to a user cart end in a single row with the summed quantity', async () => {
    const auth = `Bearer ${await h.tokenFor('CUSTOMER')}`;
    const ram = await h.product('ram', { stock: 50, reserved: 0 });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(h.app).post('/api/cart/items').set('Authorization', auth).send({ productId: ram.id, qty: 1 }),
      ),
    );

    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const rows = await h.deps.db.select().from(cartItems).where(eq(cartItems.productId, ram.id));
    expect(rows).toMatchObject([{ qty: 5, buildId: null }]);
  });

  it('parallel adds cannot push a line past available stock (guest and user)', async () => {
    const gpu = await h.product('gpu', { stock: 3, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.get('/api/cart'); // obtain the gid cookie first so all requests share one guest cart
    const auth = `Bearer ${await h.tokenFor('CUSTOMER')}`;

    const guest = await Promise.all(
      Array.from({ length: 5 }, () => agent.post('/api/cart/items').send({ productId: gpu.id, qty: 1 })),
    );
    const user = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(h.app).post('/api/cart/items').set('Authorization', auth).send({ productId: gpu.id, qty: 1 }),
      ),
    );

    for (const batch of [guest, user]) {
      expect(batch.filter((r) => r.status === 201)).toHaveLength(3);
      expect(batch.filter((r) => r.status === 409)).toHaveLength(2);
    }
    expect((await agent.get('/api/cart')).body.items[0].qty).toBe(3);
    const [row] = await h.deps.db.select().from(cartItems).where(eq(cartItems.productId, gpu.id));
    expect(row!.qty).toBe(3);
  });
});

describe('guest → user merge safety', () => {
  it('skips products hidden since they were added', async () => {
    const token = await h.tokenFor('CUSTOMER');
    const cpu = await h.product('cpu', { stock: 10, reserved: 0 });
    const ssd = await h.product('storage', { stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 1 });
    await agent.post('/api/cart/items').send({ productId: ssd.id, qty: 1 });
    await h.deps.db.update(products).set({ status: 'HIDDEN' }).where(eq(products.id, ssd.id));

    const merged = await agent.get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(merged.body.items.map((i: { product: { id: string } }) => i.product.id)).toEqual([cpu.id]);
  });

  it('keeps the guest lines when the database merge fails, and merges them on the next request', async () => {
    const token = await h.tokenFor('CUSTOMER');
    const cpu = await h.product('cpu', { stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    const first = await agent.post('/api/cart/items').send({ productId: cpu.id, qty: 2 });
    const gid = guestIdFrom(first.headers['set-cookie']);

    const db = h.deps.db;
    const failingDb = new Proxy(db, {
      get(target, prop, receiver) {
        if (prop === 'insert') {
          return (table: typeof carts | typeof cartItems) => {
            if (table === cartItems) throw new Error('simulated DB failure');
            return target.insert(table);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const broken = await request(h.appWith({ db: failingDb }))
      .get('/api/cart')
      .set('Cookie', `gid=${gid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(broken.status).toBe(500);
    expect(await h.deps.redis.hgetall(`cart:guest:${gid}`)).toEqual({ [`${cpu.id}:-`]: '2' });

    const ok = await agent.get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(ok.body.items).toMatchObject([{ qty: 2, product: { id: cpu.id } }]);
    expect(await h.deps.redis.exists(`cart:guest:${gid}`)).toBe(0);
  });
});
