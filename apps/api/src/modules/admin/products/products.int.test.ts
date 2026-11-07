import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories, inventoryMovements, products } from '../../../db/schema';
import { getCatalogVersion } from '../../../lib/catalog-version';
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

const categoryId = async (key: string) =>
  (
    await h.deps.db
      .select()
      .from(categories)
      .where(eq(categories.key, key as never))
  )[0]!;

const CPU_SPECS = {
  socket: 'AM5',
  cores: 8,
  threads: 16,
  baseClockGHz: 4.2,
  boostClockGHz: 5.4,
  tdpW: 120,
  integratedGraphics: true,
  memoryTypes: ['DDR5'],
};

async function newCpuBody(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: (await categoryId('cpu')).id,
    brand: 'AMD',
    sku: 'CPU-AMD-TEST-9750X',
    name: 'AMD Ryzen 7 9750X bản đặc biệt',
    price: 8_990_000,
    stock: 7,
    specs: CPU_SPECS,
    description: 'Zen 5, 8 nhân 16 luồng',
    ...overrides,
  };
}

describe('admin access control', () => {
  it('requires STAFF or ADMIN', async () => {
    expect((await request(h.app).get('/api/admin/products')).status).toBe(401);
    const customer = `Bearer ${await h.tokenFor('CUSTOMER')}`;
    expect((await request(h.app).get('/api/admin/products').set('Authorization', customer)).status).toBe(403);
    expect((await request(h.app).get('/api/admin/products').set('Authorization', staff)).status).toBe(200);
  });
});

describe('admin product CRUD', () => {
  it('lists products with on-hand stock, reservations and status, filterable by category and low stock', async () => {
    const gpu = await h.product('gpu', { stock: 4, reserved: 2 });
    const res = await request(h.app)
      .get('/api/admin/products?category=gpu&pageSize=100')
      .set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.items.every((p: { category: string }) => p.category === 'gpu')).toBe(true);
    const row = res.body.items.find((p: { id: string }) => p.id === gpu.id);
    expect(row).toMatchObject({ stockOnHand: 4, reserved: 2, stock: 2, status: 'ACTIVE' });

    const low = await request(h.app)
      .get('/api/admin/products?lowStock=true&pageSize=100')
      .set('Authorization', staff);
    expect(low.body.items.map((p: { id: string }) => p.id)).toContain(gpu.id);
    expect(low.body.items.every((p: { stock: number }) => p.stock <= 3)).toBe(true);

    await request(h.app).delete(`/api/admin/products/${gpu.id}`).set('Authorization', staff);
    const lowActive = await request(h.app)
      .get('/api/admin/products?lowStock=true&pageSize=100')
      .set('Authorization', staff);
    expect(lowActive.body.items.map((p: { id: string }) => p.id)).not.toContain(gpu.id);
    const summary = await request(h.app).get('/api/admin/stats/summary').set('Authorization', staff);
    expect(lowActive.body.total).toBe(summary.body.lowStockCount);
  });

  it('creates a product with validated specs, logs the opening stock and bumps the catalog version', async () => {
    const before = await getCatalogVersion(h.deps.redis);
    const res = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ specs: { ...CPU_SPECS, junk: 1 }, brand: 'AMD Mới' }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sku: 'CPU-AMD-TEST-9750X',
      slug: 'amd-ryzen-7-9750x-ban-dac-biet',
      brand: 'AMD Mới',
      category: 'cpu',
      stockOnHand: 7,
      reserved: 0,
      status: 'ACTIVE',
    });
    expect(res.body.specs).toEqual(CPU_SPECS);
    const moves = await h.deps.db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.productId, res.body.id));
    expect(moves).toMatchObject([{ delta: 7, reason: 'IMPORT' }]);
    expect(moves[0]!.actorId).toBe(await h.userId('STAFF'));
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(before);
  });

  it('rejects specs missing a required field with 422 and the field path', async () => {
    const { socket: _omit, ...specs } = CPU_SPECS;
    const res = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ specs }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'specs.socket' })]),
    );
  });

  it('rejects wrong spec types and values (enum, positive ints)', async () => {
    const res = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ specs: { ...CPU_SPECS, socket: 'LGA9999', cores: 0 } }));
    expect(res.status).toBe(422);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['specs.socket', 'specs.cores']));
  });

  it('rejects a sale price not below the price, duplicates, and unknown categories', async () => {
    const sale = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ salePrice: 9_000_000 }));
    expect(sale.status).toBe(422);
    expect(sale.body.error.details).toEqual([expect.objectContaining({ path: 'salePrice' })]);

    const existing = await h.product('cpu');
    const dup = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ sku: existing.sku }));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE');

    const noCat = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ categoryId: '00000000-0000-4000-8000-000000000000' }));
    expect(noCat.status).toBe(422);
    expect(noCat.body.error.details).toEqual([expect.objectContaining({ path: 'categoryId' })]);
  });

  it('patches price and specs, re-validating specs, and never touches stock', async () => {
    const cpu = await h.product('cpu', { stock: 5, reserved: 1 });
    const before = await getCatalogVersion(h.deps.redis);
    const ok = await request(h.app)
      .patch(`/api/admin/products/${cpu.id}`)
      .set('Authorization', staff)
      .send({ price: 5_555_000, salePrice: null, stock: 999, commercialBoost: 0.1 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      price: 5_555_000,
      salePrice: null,
      stockOnHand: 5,
      commercialBoost: 0.1,
    });
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(before);

    const bad = await request(h.app)
      .patch(`/api/admin/products/${cpu.id}`)
      .set('Authorization', staff)
      .send({ specs: { ...CPU_SPECS, memoryTypes: [] } });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.map((d: { path: string }) => d.path)).toContain('specs.memoryTypes');

    const moved = await request(h.app)
      .patch(`/api/admin/products/${cpu.id}`)
      .set('Authorization', staff)
      .send({ categoryId: (await categoryId('gpu')).id });
    expect(moved.status).toBe(422);

    expect(
      (await request(h.app).patch('/api/admin/products/nope').set('Authorization', staff).send({})).status,
    ).toBe(404);
  });

  it('soft-deletes by hiding the product', async () => {
    const ram = await h.product('ram');
    const res = await request(h.app).delete(`/api/admin/products/${ram.id}`).set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HIDDEN');
    const [row] = await h.deps.db.select().from(products).where(eq(products.id, ram.id));
    expect(row!.status).toBe('HIDDEN');
    const one = await request(h.app).get(`/api/admin/products/${ram.id}`).set('Authorization', staff);
    expect(one.body.status).toBe('HIDDEN');
  });
});

describe('PUT /api/admin/categories/:id/schema', () => {
  it('is ADMIN only, validates the schema, and new required fields apply to product writes', async () => {
    const cat = await categoryId('cpu');
    const schema = [
      ...cat.specSchema,
      {
        key: 'warrantyMonths',
        label: 'Bảo hành',
        type: 'number',
        unit: 'tháng',
        required: true,
        filterable: false,
      },
    ];

    const asStaff = await request(h.app)
      .put(`/api/admin/categories/${cat.id}/schema`)
      .set('Authorization', staff)
      .send(schema);
    expect(asStaff.status).toBe(403);

    const dup = await request(h.app)
      .put(`/api/admin/categories/${cat.id}/schema`)
      .set('Authorization', admin)
      .send([...schema, schema[0]]);
    expect(dup.status).toBe(422);

    const ok = await request(h.app)
      .put(`/api/admin/categories/${cat.id}/schema`)
      .set('Authorization', admin)
      .send(schema);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ id: cat.id, key: 'cpu' });
    expect(ok.body.specSchema.at(-1).key).toBe('warrantyMonths');

    const missing = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody());
    expect(missing.status).toBe(422);
    expect(missing.body.error.details.map((d: { path: string }) => d.path)).toEqual(['specs.warrantyMonths']);

    const created = await request(h.app)
      .post('/api/admin/products')
      .set('Authorization', staff)
      .send(await newCpuBody({ specs: { ...CPU_SPECS, warrantyMonths: 36 } }));
    expect(created.status).toBe(201);
    expect(created.body.specs.warrantyMonths).toBe(36);
    const stored = await h.deps.db
      .select()
      .from(products)
      .where(and(eq(products.id, created.body.id)));
    expect(stored[0]!.specs.warrantyMonths).toBe(36);
  });
});
