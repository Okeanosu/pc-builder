import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
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

describe('refresh failures and cookies', () => {
  const customer = () => seedUser('CUSTOMER');
  const login = () =>
    request(app).post('/api/auth/login').send({ email: customer().email, password: customer().password });
  const cleared = (res: request.Response, name: string) =>
    /Expires=Thu, 01 Jan 1970/.test(cookie(res, name) ?? '');

  it('keeps the cookies when the refresh token was already rotated by another tab', async () => {
    const first = cookiePair(await login(), 'refresh_token');
    const winner = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(winner.status).toBe(200);

    const loser = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(loser.status).toBe(401);
    expect(loser.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(cookie(loser, 'refresh_token')).toBeUndefined();
    expect(cookie(loser, 'access_token')).toBeUndefined();

    const next = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookiePair(winner, 'refresh_token'));
    expect(next.status).toBe(200);
  });

  it('clears the cookies for a missing, forged or expired refresh token', async () => {
    const { id } = (await login()).body.user;
    const expired = jwt.sign(
      { sub: id, jti: randomUUID(), typ: 'refresh', exp: Math.floor(Date.now() / 1000) - 10 },
      t.deps.env.JWT_REFRESH_SECRET,
    );
    const forged = jwt.sign({ sub: id, jti: randomUUID(), typ: 'refresh' }, 'not-our-secret');
    for (const value of [undefined, 'garbage', forged, expired]) {
      const req = request(app).post('/api/auth/refresh');
      const res = value ? await req.set('Cookie', `refresh_token=${value}`) : await req;
      expect(res.status).toBe(401);
      expect(cleared(res, 'refresh_token')).toBe(true);
      expect(cleared(res, 'access_token')).toBe(true);
    }
  });
});

describe('token types', () => {
  it('does not accept a refresh-typed or untyped token as an access token', async () => {
    const { id, email, role } = (
      await request(app)
        .post('/api/auth/login')
        .send({ email: seedUser('CUSTOMER').email, password: seedUser('CUSTOMER').password })
    ).body.user;
    const secret = t.deps.env.JWT_ACCESS_SECRET;
    const asRefresh = jwt.sign({ sub: id, email, role, typ: 'refresh' }, secret, { expiresIn: 60 });
    const untyped = jwt.sign({ sub: id, email, role }, secret, { expiresIn: 60 });
    for (const token of [asRefresh, untyped]) {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
    const proper = jwt.sign({ sub: id, email, role, typ: 'access' }, secret, { expiresIn: 60 });
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${proper}`)).status).toBe(
      200,
    );
  });

  it('does not accept an access-typed token as a refresh token, even with a live jti', async () => {
    const { id } = (
      await request(app)
        .post('/api/auth/login')
        .send({ email: seedUser('CUSTOMER').email, password: seedUser('CUSTOMER').password })
    ).body.user;
    const jti = randomUUID();
    await t.deps.redis.set(`rt:${id}:${jti}`, '1', 'EX', 60);
    const asAccess = jwt.sign({ sub: id, jti, typ: 'access' }, t.deps.env.JWT_REFRESH_SECRET, {
      expiresIn: 60,
    });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', `refresh_token=${asAccess}`);
    expect(res.status).toBe(401);
    expect(await t.deps.redis.exists(`rt:${id}:${jti}`)).toBe(1);
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

describe('POST /api/auth/password', () => {
  const email = 'doi.mat.khau@example.com';
  const oldPassword = 'MatKhauCu@123';
  const newPassword = 'MatKhauMoi@456';
  let userId: string;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: oldPassword, fullName: 'Người Đổi Mật Khẩu' });
    userId = reg.body.user.id;
  });

  const login = (password: string) => request(app).post('/api/auth/login').send({ email, password });

  it('requires a signed-in user and validates the body', async () => {
    const anonymous = await request(app)
      .post('/api/auth/password')
      .send({ currentPassword: oldPassword, newPassword });
    expect(anonymous.status).toBe(401);
    const token = (await login(oldPassword)).body.accessToken as string;
    const short = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword: 'ngan' });
    expect(short.status).toBe(422);
    expect(short.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('answers a wrong current password with 400 INVALID_CURRENT_PASSWORD and keeps the old one', async () => {
    const token = (await login(oldPassword)).body.accessToken as string;
    const res = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'sai-mat-khau', newPassword });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    expect((await login(oldPassword)).status).toBe(200);
  });

  it('changes the password, revokes every refresh token of the user and starts a fresh session', async () => {
    const first = await login(oldPassword);
    const second = await login(oldPassword);
    expect((await t.deps.redis.keys(`rt:${userId}:*`)).length).toBeGreaterThanOrEqual(2);

    const res = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${first.body.accessToken}`)
      .send({ currentPassword: oldPassword, newPassword });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: userId, email });
    expect(cookie(res, 'access_token')).toMatch(/HttpOnly/);
    expect(cookie(res, 'refresh_token')).toMatch(/Path=\/api\/auth/);

    expect(await t.deps.redis.keys(`rt:${userId}:*`)).toHaveLength(1);
    for (const old of [first, second]) {
      const refreshed = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(old, 'refresh_token'));
      expect(refreshed.status).toBe(401);
    }
    const fresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookiePair(res, 'refresh_token'));
    expect(fresh.status).toBe(200);

    expect((await login(oldPassword)).status).toBe(401);
    expect((await login(newPassword)).status).toBe(200);
  });
});

describe('expired access tokens', () => {
  const expiredFor = (user: { id: string; email: string; role: string }) =>
    jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'access',
        exp: Math.floor(Date.now() / 1000) - 10,
      },
      t.deps.env.JWT_ACCESS_SECRET,
    );
  const signIn = () => {
    const c = seedUser('CUSTOMER');
    return request(app).post('/api/auth/login').send({ email: c.email, password: c.password });
  };

  it('answers an expired Bearer token with 401 TOKEN_EXPIRED instead of serving the request as a guest', async () => {
    const expired = expiredFor((await signIn()).body.user);
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('lets /api/auth/* through so the client can still refresh', async () => {
    const session = await signIn();
    const expired = expiredFor(session.body.user);
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expired}`)
      .set('Cookie', cookiePair(session, 'refresh_token'));
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('keeps the anonymous behaviour for an expired cookie token and for tokens that are not ours', async () => {
    const expired = expiredFor((await signIn()).body.user);
    const byCookie = await request(app).get('/api/cart').set('Cookie', `access_token=${expired}`);
    expect(byCookie.status).toBe(200);
    const forged = jwt.sign(
      { sub: 'x', typ: 'access', exp: Math.floor(Date.now() / 1000) - 10 },
      'not-our-secret',
    );
    for (const token of ['garbage', forged]) {
      const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });
});

describe('register rate limit', () => {
  const invalid = { email: 'x', password: '1', fullName: '' };

  it('allows 5 registrations per minute per IP, then answers 429', async () => {
    await t.deps.redis.flushdb();
    const limited = express();
    limited.use(express.json());
    limited.use(cookieParser());
    limited.use('/api', createAuthRouter(t.deps, { registerRateLimit: true }));
    limited.use(errorHandler);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await request(limited).post('/api/auth/register').send(invalid)).status);
    }
    expect(statuses.slice(0, 5)).toEqual([422, 422, 422, 422, 422]);
    expect(statuses[5]).toBe(429);
  });

  it('is off in the test environment by default', async () => {
    for (let i = 0; i < 7; i++) {
      expect((await request(app).post('/api/auth/register').send(invalid)).status).toBe(422);
    }
  });
});
