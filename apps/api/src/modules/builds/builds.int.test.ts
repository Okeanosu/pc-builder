import { type EngineProduct, type PartMap, solve } from '@pc/engine';
import type { BuildDTO, MainboardSpecs } from '@pc/shared';
import { eq } from 'drizzle-orm';
import type express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { builds, products } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { createCatalogService } from '../catalog';
import { createBuildsService } from './index';

const t = createTestDeps();
const { db, redis } = t.deps;
let app: express.Express;
let catalog: EngineProduct[];
let parts: PartMap;
let token: string;

const idsOf = (p: PartMap) => Object.values(p).map((x) => x.id);

beforeAll(async () => {
  await seedDatabase(db);
  await redis.flushdb();
  app = createApp(t.deps);
  catalog = await createCatalogService({ db, redis }).getEngineCatalog();
  parts = solve({ budget: 25_000_000, purpose: 'gaming' }, catalog).builds[0]!.parts;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'khach@pcbuilder.vn', password: 'Khach@123' });
  token = login.body.accessToken;
});
afterAll(() => t.close());

describe('POST /api/builds', () => {
  it('saves a compatible Customizer build as CUSTOM with computed totals', async () => {
    const res = await request(app)
      .post('/api/builds')
      .send({
        name: 'Máy chơi game của tôi',
        purpose: 'gaming',
        budget: 26_000_000,
        productIds: idsOf(parts),
      });
    expect(res.status).toBe(201);
    const build = res.body as BuildDTO;
    const total = Object.values(parts).reduce((s, p) => s + p.price, 0);
    expect(build).toMatchObject({
      name: 'Máy chơi game của tôi',
      label: null,
      purpose: 'gaming',
      budget: 26_000_000,
      source: 'CUSTOM',
      totalPrice: total,
    });
    expect(build.score).toBeGreaterThan(0);
    expect(build.items.map((i) => i.product.id).sort()).toEqual(idsOf(parts).sort());
    expect(Object.values(build.allocation).reduce((s, x) => s + (x ?? 0), 0)).toBeCloseTo(1, 2);
    expect(build.estimatedWattage).toBeGreaterThan(0);
    const [row] = await db.select().from(builds).where(eq(builds.id, build.id));
    expect(row).toMatchObject({ source: 'CUSTOM', userId: null, totalPrice: total });
  });

  it('defaults the budget to the total and names the build', async () => {
    const res = await request(app)
      .post('/api/builds')
      .send({ purpose: 'gaming', productIds: idsOf(parts) });
    expect(res.status).toBe(201);
    expect(res.body.budget).toBe(res.body.totalPrice);
    expect(res.body.name).toEqual(expect.any(String));
    expect(res.body.name.length).toBeGreaterThan(0);
  });

  it('rejects hard compatibility errors with 422 INCOMPATIBLE and the issues', async () => {
    const socket = (parts.cpu!.specs as { socket: string }).socket;
    const board = catalog.find(
      (p) => p.category === 'mainboard' && (p.specs as MainboardSpecs).socket !== socket,
    )!;
    const res = await request(app)
      .post('/api/builds')
      .send({ purpose: 'gaming', productIds: idsOf({ ...parts, mainboard: board }) });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INCOMPATIBLE');
    expect(res.body.error.details).toContainEqual(
      expect.objectContaining({ code: 'C01', severity: 'error' }),
    );
  });

  it('rejects HIDDEN products like unknown ones (404 with details.missing)', async () => {
    const hidden = parts.case!.id;
    await db.update(products).set({ status: 'HIDDEN' }).where(eq(products.id, hidden));
    try {
      const res = await request(app)
        .post('/api/builds')
        .send({ purpose: 'gaming', productIds: idsOf(parts) });
      expect(res.status).toBe(404);
      expect(res.body.error.details).toEqual({ missing: [hidden] });
    } finally {
      await db.update(products).set({ status: 'ACTIVE' }).where(eq(products.id, hidden));
    }
  });

  it('answers 404 for unknown products and 422 for a bad body', async () => {
    const unknown = await request(app)
      .post('/api/builds')
      .send({ purpose: 'gaming', productIds: ['00000000-0000-4000-8000-000000000000'] });
    expect(unknown.status).toBe(404);
    const bad = await request(app).post('/api/builds').send({ purpose: 'mining', productIds: [] });
    expect(bad.status).toBe(422);
  });
});

describe('GET /api/builds/:id', () => {
  it('is public and hydrates items with current product data while keeping stored totals', async () => {
    const created = (
      await request(app)
        .post('/api/builds')
        .send({ purpose: 'gaming', productIds: idsOf(parts) })
    ).body as BuildDTO;
    const cpuId = parts.cpu!.id;
    await db.update(products).set({ price: 99_000_000, salePrice: null }).where(eq(products.id, cpuId));

    const res = await request(app).get(`/api/builds/${created.id}`);
    expect(res.status).toBe(200);
    const build = res.body as BuildDTO;
    expect(build.totalPrice).toBe(created.totalPrice);
    expect(build.score).toBe(created.score);
    expect(build.items.find((i) => i.category === 'cpu')!.product.price).toBe(99_000_000);
  });

  it('answers 404 for unknown and malformed ids', async () => {
    expect((await request(app).get('/api/builds/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await request(app).get('/api/builds/khong-phai-uuid')).status).toBe(404);
  });
});

describe('GET /api/me/builds', () => {
  it('requires sign-in', async () => {
    const res = await request(app).get('/api/me/builds');
    expect(res.status).toBe(401);
  });

  it('lists only the signed-in user builds, newest first', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const a = await request(app)
      .post('/api/builds')
      .set(auth)
      .send({ name: 'A', purpose: 'gaming', productIds: idsOf(parts) });
    const b = await request(app)
      .post('/api/builds')
      .set(auth)
      .send({ name: 'B', purpose: 'gaming', productIds: idsOf(parts) });
    expect(a.status).toBe(201);

    const res = await request(app).get('/api/me/builds').set(auth);
    expect(res.status).toBe(200);
    expect((res.body as BuildDTO[]).map((x) => x.id)).toEqual([b.body.id, a.body.id]);
  });
});

describe('createBuildsService', () => {
  it('saves an engine build with the given meta and reads it back', async () => {
    const svc = createBuildsService({ db, redis });
    const engineBuild = solve({ budget: 25_000_000, purpose: 'gaming' }, catalog).builds[0]!;
    const saved = await svc.save(engineBuild, { source: 'CHAT', purpose: 'gaming', budget: 25_000_000 });
    expect(saved).toMatchObject({
      source: 'CHAT',
      label: engineBuild.label,
      totalPrice: engineBuild.totalPrice,
      score: engineBuild.score,
      estimatedWattage: engineBuild.estimatedWattage,
    });
    expect(saved.name).toContain('Chơi game');
    expect(await svc.get(saved.id)).toEqual(saved);
    expect(await svc.get('nope')).toBeNull();
  });
});
