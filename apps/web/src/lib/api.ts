import type { ApiErrorBody } from '@pc/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

type RefreshFn = () => Promise<string | null>;
let refreshAccessToken: RefreshFn | null = null;
/** Registered by the auth store so a 401 can transparently refresh once. */
export const registerRefresh = (fn: RefreshFn) => {
  refreshAccessToken = fn;
};

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    credentials: 'include',
  });
  if (res.status === 401 && !retried && refreshAccessToken && !path.startsWith('/auth/')) {
    const token = await refreshAccessToken();
    if (token) return api<T>(path, init, true);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error.code ?? 'HTTP_ERROR',
      body?.error.message ?? res.statusText,
      body?.error.details,
    );
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}
