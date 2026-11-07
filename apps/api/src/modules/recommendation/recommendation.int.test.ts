import { DEFAULT_PROFILES } from '@pc/engine';
import type { BuildDTO, RecommendationResultDTO } from '@pc/shared';
import { eq, sql } from 'drizzle-orm';
import type express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { builds, purposeWeights } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { bumpCatalogVersion, getCatalogVersion } from '../../lib/catalog-version';
import { loadPurposeProfile } from './profile';
import { createRecommendationService } from './recommendation.service';

const t = createTestDeps();
const { db, redis } = t.deps;
let app: express.Express;

beforeAll(async () => {
  await seedDatabase(db);
  app = createApp(t.deps);
});
beforeEach(async () => {
  await db.delete(builds);
  await redis.flushdb();
});
afterAll(() => t.close());

const countBuilds = async () => (await db.select({ n: sql<number>`count(*)::int` }).from(builds))[0]!.n;

describe('POST /api/recommendations', () => {
  const body = { budget: 25_000_000, purpose: 'gaming' };

  it('persists 3 builds for 25M gaming and serves the identical request from Redis', async () => {
    const first = await request(app).post('/api/recommendations').send(body);
    expect(first.status).toBe(200);
    expect(first.headers['x-cache']).toBe('MISS');
    const result = first.body as RecommendationResultDTO;
    expect(result.builds).toHaveLength(3);
    expect(result.builds.map((b) => b.label).sort()).toEqual(['balanced', 'budget', 'performance']);
    expect(result.stats).toMatchObject({ strategy: 'full', nodesExplored: expect.any(Number) });
    expect(result).not.toHaveProperty('cache');
    for (const b of result.builds) {
      expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(b.source).toBe('FORM');
      expect(b.purpose).toBe('gaming');
      expect(b.budget).toBe(25_000_000);
      expect(b.totalPrice).toBeLessThanOrEqual(25_000_000);
      expect(b.items.length).toBeGreaterThanOrEqual(7);
      expect(b.items.every((i) => i.product.slug && i.product.category === i.category)).toBe(true);
      expect(b.totalPrice).toBe(b.items.reduce((s, i) => s + (i.product.salePrice ?? i.product.price), 0));
    }

    const rows = await db.select().from(builds);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set(result.builds.map((b) => b.id)));
    expect(rows.every((r) => r.source === 'FORM' && r.userId === null)).toBe(true);

    const second = await request(app)
      .post('/api/recommendations')
      .send({ purpose: 'gaming', budget: 25_000_000 });
    expect(second.status).toBe(200);
    expect(second.headers['x-cache']).toBe('HIT');
    expect((second.body as RecommendationResultDTO).builds.map((b) => b.id)).toEqual(
      result.builds.map((b) => b.id),
    );
    expect(second.body.stats).toEqual(result.stats);
    expect(await countBuilds()).toBe(3);

    const version = await getCatalogVersion(redis);
    const keys = await redis.keys(`cache:reco:v${version}:*`);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^cache:reco:v\d+:[0-9a-f]{40}$/);
    expect(await redis.ttl(keys[0]!)).toBeGreaterThan(590);
  });

  it('misses again after the catalog version changes', async () => {
    await request(app).post('/api/recommendations').send(body);
    await bumpCatalogVersion(redis);
    const again = await request(app).post('/api/recommendations').send(body);
    expect(again.headers['x-cache']).toBe('MISS');
    expect(await countBuilds()).toBe(6);
  });

  it('answers an infeasible request with 200, no builds, a reason and the minimum budget', async () => {
    const res = await request(app)
      .post('/api/recommendations')
      .send({ budget: 5_000_000, purpose: 'gaming', preferences: { requireDiscreteGpu: true } });
    expect(res.status).toBe(200);
    expect(res.body.builds).toEqual([]);
    expect(res.body.infeasibleReason).toBe('BUDGET_TOO_LOW');
    expect(res.body.minFeasibleBudget).toBeGreaterThan(5_000_000);
    expect(await countBuilds()).toBe(0);

    const cached = await request(app)
      .post('/api/recommendations')
      .send({ budget: 5_000_000, purpose: 'gaming', preferences: { requireDiscreteGpu: true } });
    expect(cached.headers['x-cache']).toBe('HIT');
    expect(cached.body).toEqual(res.body);
  });

  it('exposes X-Cache to the browser through CORS', async () => {
    const origin = t.deps.env.WEB_ORIGIN.split(',')[0]!;
    const res = await request(app).post('/api/recommendations').set('Origin', origin).send(body);
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Cache/i);
  });

  it('rate-limits each guest to 20 requests per minute', async () => {
    const guest = 'gid=guest-rate-limit-aaaaa';
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post('/api/recommendations').set('Cookie', guest).send(body);
      expect(res.status).toBe(200);
    }
    const limited = await request(app).post('/api/recommendations').set('Cookie', guest).send(body);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(await redis.ttl('rl:reco:g:guest-rate-limit-aaaaa')).toBeGreaterThan(0);

    const other = await request(app)
      .post('/api/recommendations')
      .set('Cookie', 'gid=another-guest-bbbbbbb')
      .send(body);
    expect(other.status).toBe(200);
  });

  it('rate-limits a signed-in user by account, whatever guest cookie is sent', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach@pcbuilder.vn', password: 'Khach@123' });
    const auth = `Bearer ${login.body.accessToken}`;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/recommendations')
        .set('Authorization', auth)
        .set('Cookie', `gid=rotating-guest-${i}-xxxxxxx`)
        .send(body);
      expect(res.status).toBe(200);
    }
    const limited = await request(app)
      .post('/api/recommendations')
      .set('Authorization', auth)
      .set('Cookie', 'gid=rotating-guest-new-xxxxxxx')
      .send(body);
    expect(limited.status).toBe(429);
  });

  it('validates the request', async () => {
    const res = await request(app).post('/api/recommendations').send({ budget: 1_000, purpose: 'gaming' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('owns builds for a signed-in user without sharing their cache entry', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach@pcbuilder.vn', password: 'Khach@123' });
    const authed = await request(app)
      .post('/api/recommendations')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send(body);
    expect(authed.headers['x-cache']).toBe('MISS');
    const anon = await request(app).post('/api/recommendations').send(body);
    expect(anon.headers['x-cache']).toBe('MISS');
    const owned = await db.select().from(builds).where(eq(builds.userId, login.body.user.id));
    expect(owned.map((r) => r.id).sort()).toEqual((authed.body.builds as BuildDTO[]).map((b) => b.id).sort());
  });
});

describe('createRecommendationService', () => {
  it('persists builds with the caller-given source and reports cache hits', async () => {
    const svc = createRecommendationService({ db, redis });
    const req = { budget: 30_000_000, purpose: 'graphics' as const };
    const first = await svc.recommend(req, { source: 'CHAT' });
    expect(first.cache).toBe('MISS');
    expect(first.builds.length).toBeGreaterThan(0);
    expect(first.builds.every((b) => b.source === 'CHAT')).toBe(true);
    const second = await svc.recommend(req, { source: 'CHAT' });
    expect(second.cache).toBe('HIT');
    expect(second.builds).toEqual(first.builds);
  });
});

describe('loadPurposeProfile', () => {
  it('reads weights and allocation from purpose_weights', async () => {
    const [row] = await db.select().from(purposeWeights).where(eq(purposeWeights.purpose, 'gaming'));
    const profile = await loadPurposeProfile(db, 'gaming');
    expect(profile).toEqual({ purpose: 'gaming', weights: row!.weights, allocation: row!.allocation });
  });

  it('falls back to the default profile when the row is missing or incomplete', async () => {
    const [saved] = await db.select().from(purposeWeights).where(eq(purposeWeights.purpose, 'office'));
    try {
      await db
        .update(purposeWeights)
        .set({ weights: { cpu: 1 } as never })
        .where(eq(purposeWeights.purpose, 'office'));
      expect(await loadPurposeProfile(db, 'office')).toEqual(DEFAULT_PROFILES.office);
      await db.delete(purposeWeights).where(eq(purposeWeights.purpose, 'office'));
      expect(await loadPurposeProfile(db, 'office')).toEqual(DEFAULT_PROFILES.office);
    } finally {
      await db.delete(purposeWeights).where(eq(purposeWeights.purpose, 'office'));
      await db.insert(purposeWeights).values(saved!);
    }
  });
});
