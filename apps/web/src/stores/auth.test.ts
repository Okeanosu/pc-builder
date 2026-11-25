// @vitest-environment jsdom
import type { UserDTO } from '@pc/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getAccessToken, setAccessToken } from '@/lib/api';
import { useAuthStore, watchTokenFreshness } from './auth';

const MIN = 60_000;
const user: UserDTO = {
  id: 'u1',
  email: 'khach@pcbuilder.vn',
  fullName: 'Nguyễn Văn Khách',
  phone: null,
  role: 'CUSTOMER',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Route = (init?: RequestInit) => Response;

/** Answers by path; records every call. */
function stubApi(routes: Record<string, Route | Route[]>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname.replace(/^\/api/, '');
      calls.push({ path, init });
      const route = routes[path];
      const handler = Array.isArray(route) ? route.shift() : route;
      if (!handler) throw new Error(`unexpected ${path}`);
      return handler(init);
    }),
  );
  return calls;
}

const countOf = (calls: { path: string }[], path: string) => calls.filter((c) => c.path === path).length;

beforeEach(() => {
  vi.useFakeTimers();
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'ready' });
});
afterEach(async () => {
  stubApi({ '/auth/logout': () => new Response(null, { status: 204 }) });
  await useAuthStore.getState().logout();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('proactive refresh', () => {
  it('renews the access token 13 minutes after login', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(200, { accessToken: 't2', user }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await vi.advanceTimersByTimeAsync(13 * MIN - 1);
    expect(countOf(calls, '/auth/refresh')).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(countOf(calls, '/auth/refresh')).toBe(1);
    expect(getAccessToken()).toBe('t2');
  });

  it('keeps renewing every 13 minutes', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(200, { accessToken: `t${Math.random()}`, user }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await vi.advanceTimersByTimeAsync(39 * MIN);
    expect(countOf(calls, '/auth/refresh')).toBe(3);
  });

  it('stops renewing after logout', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/logout': () => new Response(null, { status: 204 }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await useAuthStore.getState().logout();
    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(countOf(calls, '/auth/refresh')).toBe(0);
  });

  it('refreshes on tab focus when the token is older than 13 minutes', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(200, { accessToken: 't2', user }),
    });
    const stop = watchTokenFreshness();
    await useAuthStore.getState().login(user.email, 'Khach@123');
    window.dispatchEvent(new Event('focus'));
    expect(countOf(calls, '/auth/refresh')).toBe(0);
    vi.setSystemTime(Date.now() + 20 * MIN);
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(countOf(calls, '/auth/refresh')).toBe(1);
    expect(getAccessToken()).toBe('t2');
    stop();
  });

  it('a failed proactive refresh signs the user out once, without retrying in a loop', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(401, { error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(countOf(calls, '/auth/refresh')).toBe(1);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('refresh failures that are not a rejected session', () => {
  it('keeps the user signed in on a network error and retries on the next tick', async () => {
    let attempt = 0;
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => {
        attempt += 1;
        if (attempt === 1) throw new TypeError('Failed to fetch');
        return json(200, { accessToken: 't2', user });
      },
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    expect(await useAuthStore.getState().refresh()).toBeNull();
    expect(useAuthStore.getState().user).toEqual(user);
    expect(getAccessToken()).toBe('t1');
    expect(await useAuthStore.getState().refresh()).toBe('t2');
    expect(countOf(calls, '/auth/refresh')).toBe(2);
  });

  it('keeps the user signed in on a 500', async () => {
    stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(500, { error: { code: 'INTERNAL', message: 'Lỗi máy chủ' } }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    expect(await useAuthStore.getState().refresh()).toBeNull();
    expect(useAuthStore.getState().user).toEqual(user);
    expect(getAccessToken()).toBe('t1');
  });

  it('signs the user out on a 403', async () => {
    stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/refresh': () => json(403, { error: { code: 'FORBIDDEN', message: 'Bị khóa' } }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    expect(await useAuthStore.getState().refresh()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('changePassword', () => {
  it('re-reads the session through refresh when the server answers 204', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/password': () => new Response(null, { status: 204 }),
      '/auth/refresh': () => json(200, { accessToken: 't2', user }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await useAuthStore.getState().changePassword('Khach@123', 'MatKhauMoi@2026');
    const body = JSON.parse(String(calls.find((c) => c.path === '/auth/password')?.init?.body));
    expect(body).toEqual({ currentPassword: 'Khach@123', newPassword: 'MatKhauMoi@2026' });
    expect(countOf(calls, '/auth/refresh')).toBe(1);
    expect(getAccessToken()).toBe('t2');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('applies the token and user returned with a 200', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/password': () => json(200, { accessToken: 't9', user: { ...user, fullName: 'Khách Mới' } }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await useAuthStore.getState().changePassword('Khach@123', 'MatKhauMoi@2026');
    expect(countOf(calls, '/auth/refresh')).toBe(0);
    expect(getAccessToken()).toBe('t9');
    expect(useAuthStore.getState().user?.fullName).toBe('Khách Mới');
  });

  it('rejects a wrong current password and keeps the session', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/password': () =>
        json(400, { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' } }),
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    const err = await useAuthStore
      .getState()
      .changePassword('sai', 'MatKhauMoi@2026')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('INVALID_CURRENT_PASSWORD');
    expect(countOf(calls, '/auth/refresh')).toBe(0);
    expect(getAccessToken()).toBe('t1');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('renews an expired access token once and retries', async () => {
    const calls = stubApi({
      '/auth/login': () => json(200, { accessToken: 't1', user }),
      '/auth/password': [
        () => json(401, { error: { code: 'TOKEN_EXPIRED', message: 'Hết hạn' } }),
        () => new Response(null, { status: 204 }),
      ],
      '/auth/refresh': [
        () => json(200, { accessToken: 't2', user }),
        () => json(200, { accessToken: 't3', user }),
      ],
    });
    await useAuthStore.getState().login(user.email, 'Khach@123');
    await useAuthStore.getState().changePassword('Khach@123', 'MatKhauMoi@2026');
    const auths = calls
      .filter((c) => c.path === '/auth/password')
      .map((c) => new Headers(c.init?.headers).get('Authorization'));
    expect(auths).toEqual(['Bearer t1', 'Bearer t2']);
    expect(getAccessToken()).toBe('t3');
  });
});
