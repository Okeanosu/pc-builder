import { type EngineProduct, type PartMap, solve } from '@pc/engine';
import type { CategoryKey, CompatibilityResultDTO, MainboardSpecs } from '@pc/shared';
import { eq } from 'drizzle-orm';
import type express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { products } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { createCatalogService } from '../catalog';
import { createCompatibilityService } from './index';

const t = createTestDeps();
const { db, redis } = t.deps;
let app: express.Express;
let catalog: EngineProduct[];
let parts: PartMap;

const idsOf = (p: PartMap) => Object.values(p).map((x) => x.id);

beforeAll(async () => {
  await seedDatabase(db);
  await redis.flushdb();
  app = createApp(t.deps);
  catalog = await createCatalogService({ db, redis }).getEngineCatalog();
  const solved = solve({ budget: 25_000_000, purpose: 'gaming' }, catalog);
  parts = solved.builds[0]!.parts;
});
afterAll(() => t.close());

function otherSocketBoard(): EngineProduct {
  const socket = (parts.cpu!.specs as { socket: string }).socket;
  return catalog.find((p) => p.category === 'mainboard' && (p.specs as MainboardSpecs).socket !== socket)!;
}

describe('POST /api/compatibility/check', () => {
  it('reports a solver-made build as compatible', async () => {
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: idsOf(parts) });
    expect(res.status).toBe(200);
    const body = res.body as CompatibilityResultDTO;
    expect(body.ok).toBe(true);
    expect(body.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(body.estimatedWattage).toBeGreaterThan(0);
    expect(body.recommendedPsuWattage).toBeGreaterThanOrEqual(body.estimatedWattage);
  });

  it('flags a socket mismatch as a C01 error', async () => {
    const swapped = { ...parts, mainboard: otherSocketBoard() };
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: idsOf(swapped) });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.issues).toContainEqual(
      expect.objectContaining({ code: 'C01', severity: 'error', categories: ['cpu', 'mainboard'] }),
    );
  });

  it('checks partial builds and only runs rules whose parts are present', async () => {
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: [parts.cpu!.id, parts.mainboard!.id] });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('adds budget and balance rules when purpose and budget are given', async () => {
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: idsOf(parts), purpose: 'gaming', budget: 10_000_000 });
    expect(res.body.ok).toBe(false);
    expect(res.body.issues).toContainEqual(expect.objectContaining({ code: 'C14', severity: 'error' }));
  });

  it('treats HIDDEN products like unknown ones (404 with details.missing)', async () => {
    const hidden = parts.gpu!.id;
    await db.update(products).set({ status: 'HIDDEN' }).where(eq(products.id, hidden));
    try {
      const res = await request(app)
        .post('/api/compatibility/check')
        .send({ productIds: idsOf(parts) });
      expect(res.status).toBe(404);
      expect(res.body.error.details).toEqual({ missing: [hidden] });
    } finally {
      await db.update(products).set({ status: 'ACTIVE' }).where(eq(products.id, hidden));
    }
  });

  it('answers 404 with the missing ids for unknown products', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: [parts.cpu!.id, missing, 'not-a-uuid'] });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.details).toEqual({ missing: [missing, 'not-a-uuid'] });
  });

  it('rejects two products of the same category with 422', async () => {
    const secondCpu = catalog.find((p) => p.category === 'cpu' && p.id !== parts.cpu!.id)!;
    const res = await request(app)
      .post('/api/compatibility/check')
      .send({ productIds: [parts.cpu!.id, secondCpu.id] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('DUPLICATE_CATEGORY');
    expect(res.body.error.details).toEqual({ categories: ['cpu' satisfies CategoryKey] });
  });

  it('validates the body (1..16 ids)', async () => {
    expect((await request(app).post('/api/compatibility/check').send({ productIds: [] })).status).toBe(422);
    const many = Array.from({ length: 17 }, () => parts.cpu!.id);
    expect((await request(app).post('/api/compatibility/check').send({ productIds: many })).status).toBe(422);
  });
});

describe('createCompatibilityService', () => {
  it('ignores repeated ids of the same product', async () => {
    const svc = createCompatibilityService({ db, redis });
    const result = await svc.check([parts.cpu!.id, parts.cpu!.id, parts.mainboard!.id]);
    expect(result.ok).toBe(true);
  });
});
