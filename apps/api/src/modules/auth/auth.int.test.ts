import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { seedDatabase } from '../../db/seed';
import { SEED_USERS } from '../../db/seed/users';
import { errorHandler } from '../../lib/errors';
import { optionalAuth, requireRole } from '../../middleware/auth';
import { createAuthRouter } from './index';

const t = createTestDeps();
let app: express.Express;

beforeAll(async () => {
  await seedDatabase(t.deps.db);
  await t.deps.redis.flushdb();
  app = createApp(t.deps);
});
afterAll(() => t.close());

const cookiesOf = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'] as unknown;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [String(raw)];
};
const cookie = (res: request.Response, name: string) => cookiesOf(res).find((c) => c.startsWith(`${name}=`));
const cookiePair = (res: request.Response, name: string) => cookie(res, name)?.split(';')[0] ?? '';

const seedUser = (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => SEED_USERS.find((u) => u.role === role)!;

describe('auth flow', () => {
  const email = 'nguoi.moi@example.com';
  const password = 'MatKhau@123';

  it('register → login → me → refresh → logout, and refresh after logout is 401', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'Nguoi.Moi@Example.com', password, fullName: 'Người Mới' });
    expect(reg.status).toBe(201);
    expect(reg.body.accessToken).toEqual(expect.any(String));
    expect(reg.body.user).toMatchObject({ email, fullName: 'Người Mới', phone: null, role: 'CUSTOMER' });
    expect(reg.body.user).not.toHaveProperty('passwordHash');
    expect(cookie(reg, 'access_token')).toMatch(/HttpOnly/);
    const regRefresh = cookie(reg, 'refresh_token');
    expect(regRefresh).toMatch(/HttpOnly/);
    expect(regRefresh).toMatch(/Path=\/api\/auth/);
    expect(regRefresh).toMatch(/SameSite=Lax/);
    expect(regRefresh).not.toMatch(/Secure/);

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(reg.body.user.id);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(reg.body.user);

    const meByCookie = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookiePair(login, 'access_token'));
    expect(meByCookie.status).toBe(200);

    const firstRefresh = cookiePair(login, 'refresh_token');
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', firstRefresh);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.user.id).toBe(reg.body.user.id);
    const rotated = cookiePair(refreshed, 'refresh_token');
    expect(rotated).not.toBe(firstRefresh);

    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', firstRefresh);
    expect(reuse.status).toBe(401);

    const out = await request(app).post('/api/auth/logout').set('Cookie', rotated);
    expect(out.status).toBe(204);
    expect(cookie(out, 'refresh_token')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', rotated);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('keeps the refresh jti in Redis at rt:{userId}:{jti} for 7 days', async () => {
    const { id } = (await request(app).post('/api/auth/login').send({ email, password })).body.user;
    const before = new Set(await t.deps.redis.keys(`rt:${id}:*`));
    await request(app).post('/api/auth/login').send({ email, password });
    const added = (await t.deps.redis.keys(`rt:${id}:*`)).filter((k) => !before.has(k));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatch(new RegExp(`^rt:${id}:[0-9a-f-]{36}$`));
    const ttl = await t.deps.redis.ttl(added[0]!);
    expect(ttl).toBeGreaterThan(7 * 24 * 3600 - 60);
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 3600);
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: seedUser('CUSTOMER').email.toUpperCase(), password, fullName: 'Trùng Email' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('answers unknown email and wrong password with the same 401', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khong.co@example.com', password });
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: seedUser('CUSTOMER').email, password: 'sai-mat-khau' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the register body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x', password: '1', fullName: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires a token for /auth/me and a refresh cookie for /auth/refresh', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', 'refresh_token=garbage')).status).toBe(
      401,
    );
  });
});

describe('role checks', () => {
  it('lets ADMIN through an ADMIN-only route and answers STAFF with 403', async () => {
    const probe = express();
    probe.use(express.json());
    probe.use(optionalAuth(t.deps.env.JWT_ACCESS_SECRET));
    probe.put('/api/admin/weights', requireRole('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });
    probe.use(errorHandler);

    const tokenFor = async (role: 'ADMIN' | 'STAFF') => {
      const u = seedUser(role);
      const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
      expect(res.body.user.role).toBe(role);
      return res.body.accessToken as string;
    };

    const staff = await request(probe)
      .put('/api/admin/weights')
      .set('Authorization', `Bearer ${await tokenFor('STAFF')}`)
      .send({});
    expect(staff.status).toBe(403);
    expect(staff.body.error.code).toBe('FORBIDDEN');

    const admin = await request(probe)
      .put('/api/admin/weights')
      .set('Authorization', `Bearer ${await tokenFor('ADMIN')}`)
      .send({});
    expect(admin.status).toBe(200);
  });
});

describe('login rate limit', () => {
  it('allows 5 attempts per minute per IP, then answers 429', async () => {
    const limited = express();
    limited.use(express.json());
    limited.use(cookieParser());
    limited.use('/api', createAuthRouter(t.deps, { loginRateLimit: true }));
    limited.use(errorHandler);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(limited)
        .post('/api/auth/login')
        .send({ email: 'khong.co@example.com', password: 'x' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('is off in the test environment by default', async () => {
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'khong.co@example.com', password: 'x' });
      expect(res.status).toBe(401);
    }
  });
});
