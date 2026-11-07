'use client';

import type { UserDTO } from '@pc/shared';
import { create } from 'zustand';
import { ApiError, api, registerRefresh, setAccessToken } from '@/lib/api';
import { createRefreshScheduler } from '@/lib/token-refresh';

interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}

interface AuthState {
  user: UserDTO | null;
  status: 'idle' | 'loading' | 'ready';
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  /** Rejects with ApiError (e.g. 400 INVALID_CURRENT_PASSWORD); the session stays as it was. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

let inflightRefresh: Promise<string | null> | null = null;

const scheduler = createRefreshScheduler({ refresh: () => useAuthStore.getState().refresh() });

export const useAuthStore = create<AuthState>((set, get) => {
  const apply = (res: AuthResponse) => {
    setAccessToken(res.accessToken);
    scheduler.tokenApplied();
    set({ user: res.user, status: 'ready' });
    return res.user;
  };

  const clear = () => {
    scheduler.cleared();
    setAccessToken(null);
    set({ user: null });
  };

  const postPassword = (json: { currentPassword: string; newPassword: string }) =>
    api<AuthResponse | undefined>('/auth/password', { method: 'POST', json });

  return {
    user: null,
    status: 'idle',

    async bootstrap() {
      if (get().status !== 'idle') return;
      set({ status: 'loading' });
      await get().refresh();
      set({ status: 'ready' });
    },

    async login(email, password) {
      return apply(await api<AuthResponse>('/auth/login', { method: 'POST', json: { email, password } }));
    },

    async register(input) {
      return apply(await api<AuthResponse>('/auth/register', { method: 'POST', json: input }));
    },

    async logout() {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
      clear();
    },

    // Single-flight: the server rotates refresh tokens strictly, so concurrent refreshes would log the user out.
    refresh() {
      inflightRefresh ??= api<AuthResponse>('/auth/refresh', { method: 'POST' })
        .then((res) => apply(res) && res.accessToken)
        .catch((err: unknown) => {
          // Only a rejected session ends it; a network blip or 5xx leaves the next tick to retry.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) clear();
          return null;
        })
        .finally(() => {
          inflightRefresh = null;
        });
      return inflightRefresh;
    },

    async changePassword(currentPassword, newPassword) {
      const input = { currentPassword, newPassword };
      let res: AuthResponse | undefined;
      try {
        res = await postPassword(input);
      } catch (err) {
        // /auth/* is never auto-refreshed by api(), so renew an expired access token here, once.
        if (!(err instanceof ApiError) || err.status !== 401 || !(await get().refresh())) throw err;
        res = await postPassword(input);
      }
      // The server rotates the session on a password change: either it hands back the new token or we re-read it.
      if (res?.accessToken) apply(res);
      else await get().refresh();
    },
  };
});

registerRefresh(() => useAuthStore.getState().refresh());

/** Renews a token that went stale while the tab slept; returns the cleanup for an effect. */
export function watchTokenFreshness(): () => void {
  const onFocus = () => scheduler.onResume();
  const onVisible = () => {
    if (document.visibilityState === 'visible') scheduler.onResume();
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
