import type { CategoryDTO, FacetDTO, ProductSummaryDTO } from '@pc/shared';
import { eq, sql } from 'drizzle-orm';
import type express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { benchmarks, brands, categories, products } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { bumpCatalogVersion, getCatalogVersion } from '../../lib/catalog-version';
import { productSearchQueries } from './catalog.repository';
import { createCatalogService } from './catalog.service';

const t = createTestDeps();
const { db, redis } = t.deps;
let app: express.Express;

beforeAll(async () => {
  await seedDatabase(db);
  await redis.flushdb();
  app = createApp(t.deps);
});
afterAll(() => t.close());

async function cpuRows() {
  return db
    .select({ product: products, bench: benchmarks })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(benchmarks, eq(benchmarks.productId, products.id))
    .where(eq(categories.key, 'cpu'));
}

describe('GET /api/categories', () => {
  it('lists every category in sort order with its spec schema', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    const body = res.body as CategoryDTO[];
    expect(body.map((c) => c.key)).toEqual([
      'cpu',
      'mainboard',
      'ram',
      'gpu',
      'storage',
      'psu',
      'case',
      'cooler',
    ]);
    expect(body[0]!.specSchema.find((f) => f.key === 'socket')).toMatchObject({
      type: 'enum',
      filterable: true,
    });
  });
});

describe('GET /api/products', () => {
  it('filters by JSONB containment: category=cpu&specs[socket]=AM5 returns only AM5 CPUs', async () => {
    const res = await request(app).get('/api/products?category=cpu&specs[socket]=AM5&pageSize=60');
    expect(res.status).toBe(200);
    const items = res.body.items as ProductSummaryDTO[];
    const expected = (await cpuRows()).filter((r) => r.product.specs.socket === 'AM5');
    expect(items.length).toBeGreaterThan(0);
    expect(res.body.total).toBe(expected.length);
    expect(items.every((p) => p.category === 'cpu' && p.keySpecs.socket === 'AM5')).toBe(true);
  });

  it('types values by the spec schema and ORs comma-separated values', async () => {
    const rows = await cpuRows();
    const igpu = await request(app).get(
      '/api/products?category=cpu&specs[integratedGraphics]=true&pageSize=60',
    );
    expect(igpu.body.total).toBe(rows.filter((r) => r.product.specs.integratedGraphics === true).length);

    const ddr4 = await request(app).get('/api/products?category=cpu&specs[memoryTypes]=DDR4&pageSize=60');
    expect(ddr4.body.total).toBe(
      rows.filter((r) => (r.product.specs.memoryTypes as string[]).includes('DDR4')).length,
    );

    const either = await request(app).get('/api/products?category=cpu&specs[socket]=AM5,AM4&pageSize=60');
    expect(either.body.total).toBe(
      rows.filter((r) => ['AM5', 'AM4'].includes(String(r.product.specs.socket))).length,
    );
    const sockets = new Set((either.body.items as ProductSummaryDTO[]).map((p) => p.keySpecs.socket));
    expect([...sockets].sort()).toEqual(['AM4', 'AM5']);
  });

  it('applies numeric spec ranges with specsMin/specsMax', async () => {
    const res = await request(app).get(
      '/api/products?category=cpu&specsMin[cores]=8&specsMax[cores]=12&pageSize=60',
    );
    expect(res.status).toBe(200);
    const expected = (await cpuRows()).filter((r) => {
      const cores = Number(r.product.specs.cores);
      return cores >= 8 && cores <= 12;
    });
    expect(res.body.total).toBe(expected.length);
    for (const p of res.body.items as ProductSummaryDTO[]) {
      expect(Number(p.keySpecs.cores)).toBeGreaterThanOrEqual(8);
      expect(Number(p.keySpecs.cores)).toBeLessThanOrEqual(12);
    }
  });

  it('never answers 500 for a malformed specs parameter', async () => {
    const mixed = await request(app).get(
      '/api/products?category=cpu&specs=foo&specs[socket]=AM5&pageSize=60',
    );
    expect(mixed.status).toBe(200);
    expect((mixed.body.items as ProductSummaryDTO[]).every((p) => p.keySpecs.socket === 'AM5')).toBe(true);
    const reversed = await request(app).get('/api/products?category=cpu&specs[socket]=AM5&specs=foo');
    expect(reversed.status).toBe(200);
    const bare = await request(app).get('/api/products?specs=foo');
    expect(bare.status).toBe(422);
    expect(bare.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('answers 422 for a value that does not fit the field type', async () => {
    const res = await request(app).get('/api/products?category=cpu&specs[cores]=many');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('searches name and sku with q', async () => {
    const res = await request(app).get('/api/products?q=ryzen 7&pageSize=60');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect((res.body.items as ProductSummaryDTO[]).every((p) => /ryzen 7/i.test(p.name))).toBe(true);

    const bySku = await request(app).get('/api/products?q=CPU-AMD-R5-7600X');
    expect((bySku.body.items as ProductSummaryDTO[]).map((p) => p.sku)).toContain('CPU-AMD-R5-7600X');

    const wildcard = await request(app).get('/api/products?q=%25');
    expect(wildcard.body.total).toBe(0);
  });

  it('filters by brand, effective price range and stock', async () => {
    const res = await request(app).get(
      '/api/products?category=cpu&brand=intel&minPrice=3000000&maxPrice=8000000&inStock=true&pageSize=60',
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const p of res.body.items as ProductSummaryDTO[]) {
      const price = p.salePrice ?? p.price;
      expect(p.brand).toBe('Intel');
      expect(price).toBeGreaterThanOrEqual(3_000_000);
      expect(price).toBeLessThanOrEqual(8_000_000);
      expect(p.stock).toBeGreaterThan(0);
    }
    const all = await request(app).get('/api/products?category=cpu&inStock=false&pageSize=60');
    expect((all.body.items as ProductSummaryDTO[]).some((p) => p.stock === 0)).toBe(true);
  });

  it('sorts by effective price and by benchmark for sort=performance', async () => {
    const asc = await request(app).get('/api/products?category=gpu&sort=price_asc&pageSize=60');
    const prices = (asc.body.items as ProductSummaryDTO[]).map((p) => p.salePrice ?? p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const perf = await request(app).get('/api/products?category=cpu&sort=performance&pageSize=5');
    const multi = new Map((await cpuRows()).map((r) => [r.product.id, r.bench?.cpuMulti ?? 0]));
    const scores = (perf.body.items as ProductSummaryDTO[]).map((p) => multi.get(p.id)!);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBe(Math.max(...multi.values()));
  });

  it('paginates', async () => {
    const p1 = await request(app).get('/api/products?category=cpu&pageSize=5&page=1&sort=name');
    const p2 = await request(app).get('/api/products?category=cpu&pageSize=5&page=2&sort=name');
    expect(p1.body).toMatchObject({ page: 1, pageSize: 5 });
    expect(p1.body.items).toHaveLength(5);
    expect(p2.body.page).toBe(2);
    const ids1 = new Set((p1.body.items as ProductSummaryDTO[]).map((p) => p.id));
    expect((p2.body.items as ProductSummaryDTO[]).some((p) => ids1.has(p.id))).toBe(false);
    expect(p1.body.total).toBe((await cpuRows()).length);
  });

  it('hides HIDDEN products from the list and detail', async () => {
    const [victim] = await cpuRows();
    await db.update(products).set({ status: 'HIDDEN' }).where(eq(products.id, victim!.product.id));
    try {
      const list = await request(app).get('/api/products?category=cpu&pageSize=60');
      expect((list.body.items as ProductSummaryDTO[]).some((p) => p.id === victim!.product.id)).toBe(false);
      expect((await request(app).get(`/api/products/${victim!.product.slug}`)).status).toBe(404);
    } finally {
      await db.update(products).set({ status: 'ACTIVE' }).where(eq(products.id, victim!.product.id));
    }
  });
});

describe('GET /api/products/:slugOrId', () => {
  it('returns the ProductDTO with benchmark by slug or id', async () => {
    const bySlug = await request(app).get('/api/products/amd-ryzen-5-7600');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body).toMatchObject({
      name: 'AMD Ryzen 5 7600',
      category: 'cpu',
      specs: { socket: 'AM5' },
      benchmark: { cpuSingle: expect.any(Number), cpuMulti: expect.any(Number) },
    });
    const byId = await request(app).get(`/api/products/${bySlug.body.id}`);
    expect(byId.body).toEqual(bySlug.body);
  });

  it('answers 404 for unknown slugs and ids', async () => {
    expect((await request(app).get('/api/products/khong-ton-tai')).status).toBe(404);
    const res = await request(app).get('/api/products/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/categories/:key/facets', () => {
  it('returns distinct values with counts for each filterable field', async () => {
    const res = await request(app).get('/api/categories/cpu/facets');
    expect(res.status).toBe(200);
    const facets = res.body as FacetDTO[];
    expect(facets.map((f) => f.key)).toEqual(['socket', 'cores', 'integratedGraphics', 'memoryTypes']);

    const rows = await cpuRows();
    const socket = facets.find((f) => f.key === 'socket')!;
    expect(socket).toMatchObject({ label: 'Socket', type: 'enum' });
    const socketCounts = new Map<string, number>();
    for (const r of rows) {
      const s = String(r.product.specs.socket);
      socketCounts.set(s, (socketCounts.get(s) ?? 0) + 1);
    }
    expect(Object.fromEntries(socket.values.map((v) => [v.value, v.count]))).toEqual(
      Object.fromEntries(socketCounts),
    );

    const memory = facets.find((f) => f.key === 'memoryTypes')!;
    expect(memory.values.map((v) => v.value)).toEqual(['DDR4', 'DDR5']);
    expect(memory.values.find((v) => v.value === 'DDR5')!.count).toBe(
      rows.filter((r) => (r.product.specs.memoryTypes as string[]).includes('DDR5')).length,
    );

    const cores = facets.find((f) => f.key === 'cores')!.values.map((v) => Number(v.value));
    expect(cores).toEqual([...cores].sort((a, b) => a - b));
  });

  it('answers 404 for an unknown category', async () => {
    expect((await request(app).get('/api/categories/khong-co/facets')).status).toBe(404);
  });
});

describe('getEngineCatalog', () => {
  it('loads ACTIVE in-stock products and caches them under the catalog version', async () => {
    const catalog = createCatalogService({ db, redis });
    const version = await getCatalogVersion(redis);
    const first = await catalog.getEngineCatalog();

    const buyable = await db
      .select({ id: products.id })
      .from(products)
      .where(sql`${products.status} = 'ACTIVE' and ${products.stock} - ${products.reserved} > 0`);
    expect(first).toHaveLength(buyable.length);
    expect(first.every((p) => p.stock > 0)).toBe(true);
    expect(await redis.ttl(`cache:candidates:v${version}`)).toBeGreaterThan(290);

    const cached = JSON.parse((await redis.get(`cache:candidates:v${version}`))!);
    expect(cached).toEqual(first);

    const [one] = first;
    await db.update(products).set({ stock: 0 }).where(eq(products.id, one!.id));
    expect(await catalog.getEngineCatalog()).toHaveLength(first.length);
    const next = await bumpCatalogVersion(redis);
    const fresh = await catalog.getEngineCatalog();
    expect(fresh.some((p) => p.id === one!.id)).toBe(false);
    expect(await redis.exists(`cache:candidates:v${next}`)).toBe(1);
  });
});

describe('JSONB containment index', () => {
  it('lets the planner use products_specs_gin on a large table', async () => {
    const [cpu] = await db.select().from(categories).where(eq(categories.key, 'cpu'));
    const [brand] = await db.select().from(brands).limit(1);
    await db.execute(sql`
      INSERT INTO products (category_id, brand_id, sku, slug, name, price, stock, specs)
      SELECT ${cpu!.id}, ${brand!.id}, 'SYN-' || g, 'syn-' || g, 'Synthetic CPU ' || g, 1000000 + g, 5,
             jsonb_build_object('socket', 'SYN' || (g % 40), 'cores', (g % 16) + 1, 'memoryTypes', '["DDR5"]'::jsonb)
      FROM generate_series(1, 5000) AS g`);
    await db.execute(sql`ANALYZE products`);

    const { items } = productSearchQueries(
      db,
      { category: 'cpu', specs: { socket: 'AM5' }, sort: 'newest', page: 1, pageSize: 24 },
      { categoryId: cpu!.id },
    );
    const compiled = items.toSQL();
    expect(compiled.sql).toContain('@>');

    const rows = await t.sql.unsafe(`EXPLAIN ${compiled.sql}`, compiled.params as never[]);
    const plan = rows.map((r) => String(r['QUERY PLAN'])).join('\n');
    expect(plan).toContain('products_specs_gin');

    const res = await request(app).get('/api/products?category=cpu&specs[socket]=AM5&pageSize=60');
    expect(res.body.total).toBe((await cpuRows()).filter((r) => r.product.specs.socket === 'AM5').length);
  });
});
