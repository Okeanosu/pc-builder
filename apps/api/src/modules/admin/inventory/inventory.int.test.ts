import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createCommerceHarness } from '../../../../test/test-support';
import { benchmarks, inventoryMovements } from '../../../db/schema';
import { getCatalogVersion } from '../../../lib/catalog-version';

const h = createCommerceHarness();
afterAll(() => h.close());

let staff: string;
beforeEach(async () => {
  await h.seed();
  staff = `Bearer ${await h.tokenFor('STAFF')}`;
});

describe('POST /api/admin/inventory/:productId/adjust', () => {
  it('imports stock, writes an IMPORT movement with the actor and bumps the catalog version', async () => {
    const ssd = await h.product('storage', { stock: 2, reserved: 0 });
    const before = await getCatalogVersion(h.deps.redis);
    const res = await request(h.app)
      .post(`/api/admin/inventory/${ssd.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: 10, reason: 'IMPORT', note: 'Nhập lô tháng 11' });

    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ id: ssd.id, stockOnHand: 12, stock: 12 });
    expect(res.body.movement).toMatchObject({ delta: 10, reason: 'IMPORT', ref: 'Nhập lô tháng 11' });
    expect(res.body.movement.actor).toMatchObject({ email: 'staff@pcbuilder.vn' });
    expect((await h.getProduct(ssd.id)).stock).toBe(12);
    const rows = await h.deps.db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.productId, ssd.id));
    expect(rows.find((r) => r.ref === 'Nhập lô tháng 11')).toMatchObject({ delta: 10, reason: 'IMPORT' });
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(before);
  });

  it('never lets stock fall below what unpaid orders hold', async () => {
    const psu = await h.product('psu', { stock: 5, reserved: 3 });
    const tooFar = await request(h.app)
      .post(`/api/admin/inventory/${psu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: -3, reason: 'ADJUST', note: 'Hàng lỗi' });
    expect(tooFar.status).toBe(409);
    expect(tooFar.body.error).toMatchObject({
      code: 'STOCK_BELOW_RESERVED',
      details: { stock: 5, reserved: 3, delta: -3 },
    });
    expect((await h.getProduct(psu.id)).stock).toBe(5);

    const ok = await request(h.app)
      .post(`/api/admin/inventory/${psu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: -2, reason: 'ADJUST' });
    expect(ok.status).toBe(200);
    expect(ok.body.product).toMatchObject({ stockOnHand: 3, reserved: 3, stock: 0 });
  });

  it('validates the request and 404s unknown products', async () => {
    const psu = await h.product('psu');
    const negImport = await request(h.app)
      .post(`/api/admin/inventory/${psu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: -1, reason: 'IMPORT' });
    expect(negImport.status).toBe(422);
    const zero = await request(h.app)
      .post(`/api/admin/inventory/${psu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: 0, reason: 'ADJUST' });
    expect(zero.status).toBe(422);
    const orderReason = await request(h.app)
      .post(`/api/admin/inventory/${psu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: 1, reason: 'ORDER' });
    expect(orderReason.status).toBe(422);
    const missing = await request(h.app)
      .post('/api/admin/inventory/00000000-0000-4000-8000-000000000000/adjust')
      .set('Authorization', staff)
      .send({ delta: 1, reason: 'IMPORT' });
    expect(missing.status).toBe(404);
  });

  it('lists the movement history newest first, including sales from paid orders', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 0 });
    await request(h.app)
      .post(`/api/admin/inventory/${cpu.id}/adjust`)
      .set('Authorization', staff)
      .send({ delta: 3, reason: 'IMPORT' });
    const order = await h.placeOrder([{ productId: cpu.id, qty: 2 }], { pay: true });

    const res = await request(h.app)
      .get(`/api/admin/inventory/${cpu.id}/movements`)
      .set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ delta: -2, reason: 'ORDER', ref: order.code, actor: null });
    expect(res.body.items[1]).toMatchObject({ delta: 3, reason: 'IMPORT' });
    expect(res.body.total).toBe(res.body.items.length);
  });
});

describe('benchmarks', () => {
  it('reads and upserts a product benchmark, bumping the catalog version', async () => {
    const gpu = await h.product('gpu');
    const current = await request(h.app).get(`/api/admin/benchmarks/${gpu.id}`).set('Authorization', staff);
    expect(current.status).toBe(200);
    expect(current.body).toMatchObject({ productId: gpu.id, productName: gpu.name, category: 'gpu' });

    const before = await getCatalogVersion(h.deps.redis);
    const res = await request(h.app)
      .put(`/api/admin/benchmarks/${gpu.id}`)
      .set('Authorization', staff)
      .send({ gpuScore: 15_432, source: '3DMark Time Spy (đo lại)' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ gpuScore: 15_432, source: '3DMark Time Spy (đo lại)' });
    const [row] = await h.deps.db.select().from(benchmarks).where(eq(benchmarks.productId, gpu.id));
    expect(row!.gpuScore).toBe(15_432);
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(before);

    const invalid = await request(h.app)
      .put(`/api/admin/benchmarks/${gpu.id}`)
      .set('Authorization', staff)
      .send({ gpuScore: -5 });
    expect(invalid.status).toBe(422);
  });

  it('lists CPU benchmarks for the benchmark table', async () => {
    const res = await request(h.app).get('/api/admin/benchmarks?category=cpu').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((b: { category: string }) => b.category === 'cpu')).toBe(true);
    expect(res.body[0]).toHaveProperty('cpuMulti');
  });
});
