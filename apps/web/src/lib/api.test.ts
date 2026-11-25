import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiWithHeaders, getAccessToken, registerRefresh, setAccessToken } from './api';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const expired = () => json(401, { error: { code: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn' } });

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error('unexpected fetch');
    return next;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const authHeader = (init: RequestInit | undefined) => new Headers(init?.headers).get('Authorization');

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  registerRefresh(async () => null);
});

describe('api', () => {
  it('refreshes once on 401 TOKEN_EXPIRED and retries with the new token', async () => {
    setAccessToken('old');
    const refresh = vi.fn(async () => {
      setAccessToken('fresh');
      return 'fresh';
    });
    registerRefresh(refresh);
    const fetchMock = stubFetch(expired(), json(200, { items: [], subtotal: 0, itemCount: 0 }));

    const cart = await api<{ itemCount: number }>('/cart');

    expect(cart.itemCount).toBe(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[0]?.[1])).toBe('Bearer old');
    expect(authHeader(fetchMock.mock.calls[1]?.[1])).toBe('Bearer fresh');
  });

  it('surfaces TOKEN_EXPIRED when the refresh itself fails, without looping', async () => {
    setAccessToken('old');
    const refresh = vi.fn(async () => {
      setAccessToken(null);
      return null;
    });
    registerRefresh(refresh);
    const fetchMock = stubFetch(expired());

    const err = await api('/orders/PCB1').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe('TOKEN_EXPIRED');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('never refreshes for auth routes', async () => {
    const refresh = vi.fn(async () => 'x');
    registerRefresh(refresh);
    stubFetch(json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Sai mật khẩu' } }));
    await expect(api('/auth/login', { method: 'POST', json: {} })).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('apiWithHeaders', () => {
  it('returns the parsed body together with the response headers', async () => {
    stubFetch(json(200, { builds: [] }, { 'X-Cache': 'HIT' }));
    const { data, headers } = await apiWithHeaders<{ builds: unknown[] }>('/recommendations', {
      method: 'POST',
      json: { budget: 25_000_000, purpose: 'gaming' },
    });
    expect(data.builds).toEqual([]);
    expect(headers.get('X-Cache')).toBe('HIT');
  });

  it('returns the headers of the retried response after a refresh', async () => {
    setAccessToken('old');
    registerRefresh(async () => {
      setAccessToken('fresh');
      return 'fresh';
    });
    stubFetch(expired(), json(200, { builds: [] }, { 'X-Cache': 'MISS' }));
    const { headers } = await apiWithHeaders('/recommendations', { method: 'POST', json: {} });
    expect(headers.get('X-Cache')).toBe('MISS');
  });
});
