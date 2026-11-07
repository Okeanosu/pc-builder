import { PURPOSES } from '@pc/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { purposeWeights } from '../../../db/schema';
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

const WEIGHTS = {
  cpu: 0.25,
  gpu: 0.4,
  ram: 0.1,
  storage: 0.07,
  mainboard: 0.07,
  psu: 0.05,
  case: 0.03,
  cooler: 0.03,
};
const allocation = (spread = 0.05) =>
  Object.fromEntries(
    Object.entries(WEIGHTS).map(([k, w]) => [
      k,
      { min: Math.max(0, +(w - spread).toFixed(3)), max: +(w + spread).toFixed(3) },
    ]),
  );

describe('GET /api/admin/weights', () => {
  it('lists the weight matrix for every purpose', async () => {
    const res = await request(h.app).get('/api/admin/weights').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.map((r: { purpose: string }) => r.purpose)).toEqual([...PURPOSES]);
    expect(res.body[0].weights).toHaveProperty('gpu');
    expect(res.body[0].allocation.gpu).toHaveProperty('min');
  });
});

describe('PUT /api/admin/weights/:purpose', () => {
  it('is ADMIN only', async () => {
    const res = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', staff)
      .send({ weights: WEIGHTS, allocation: allocation() });
    expect(res.status).toBe(403);
  });

  it('saves valid weights, records the editor and invalidates recommendation caches', async () => {
    await h.deps.redis.set('cache:reco:stale-entry', '{}', 'EX', 600);
    const before = await getCatalogVersion(h.deps.redis);

    const res = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', admin)
      .send({ weights: WEIGHTS, allocation: allocation() });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      purpose: 'gaming',
      weights: WEIGHTS,
      updatedBy: await h.userId('ADMIN'),
    });
    const [row] = await h.deps.db.select().from(purposeWeights).where(eq(purposeWeights.purpose, 'gaming'));
    expect(row!.weights).toEqual(WEIGHTS);
    expect(await getCatalogVersion(h.deps.redis)).toBeGreaterThan(before);
    expect(await h.deps.redis.exists('cache:reco:stale-entry')).toBe(0);
  });

  it('rejects weights that do not sum to 1 (±0.001)', async () => {
    const res = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', admin)
      .send({ weights: { ...WEIGHTS, gpu: 0.45 }, allocation: allocation() });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: 'weights' })]);

    const nearlyOne = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', admin)
      .send({ weights: { ...WEIGHTS, gpu: 0.4005 }, allocation: allocation() });
    expect(nearlyOne.status).toBe(200);
  });

  it('rejects an allocation whose min exceeds max, missing categories and unknown purposes', async () => {
    const bad = allocation();
    bad.cpu = { min: 0.4, max: 0.2 };
    const minMax = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', admin)
      .send({ weights: WEIGHTS, allocation: bad });
    expect(minMax.status).toBe(422);
    expect(minMax.body.error.details).toEqual([expect.objectContaining({ path: 'allocation.cpu' })]);

    const { cooler: _omit, ...partial } = WEIGHTS;
    const missing = await request(h.app)
      .put('/api/admin/weights/gaming')
      .set('Authorization', admin)
      .send({ weights: partial, allocation: allocation() });
    expect(missing.status).toBe(422);

    const unknown = await request(h.app)
      .put('/api/admin/weights/mining')
      .set('Authorization', admin)
      .send({ weights: WEIGHTS, allocation: allocation() });
    expect(unknown.status).toBe(404);
  });
});
