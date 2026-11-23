import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../test/helpers';
import { createApp } from './app';

const t = createTestDeps();
afterAll(() => t.close());

describe('GET /api/health', () => {
  it('reports db and redis up and fallback AI mode without a key', async () => {
    const res = await request(createApp(t.deps)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up', redis: 'up', ai: 'fallback' });
  });

  it('returns the standard error body for unknown routes', async () => {
    const res = await request(createApp(t.deps)).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('proxy trust', () => {
  it('trusts as many proxy hops as TRUST_PROXY_HOPS, so rate limits key on the visitor IP', () => {
    const app = createApp({ ...t.deps, env: { ...t.deps.env, TRUST_PROXY_HOPS: 2 } });
    expect(app.get('trust proxy')).toBe(2);
  });
});
