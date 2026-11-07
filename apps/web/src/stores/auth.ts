'use client';

import type { UserDTO } from '@pc/shared';
import { create } from 'zustand';
import { api, registerRefresh, setAccessToken } from '@/lib/api';

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
}

let inflightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  const apply = (res: AuthResponse) => {
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'ready' });
    return res.user;
  };

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
      setAccessToken(null);
      set({ user: null });
    },

    // Single-flight: the server rotates refresh tokens strictly, so concurrent refreshes would log the user out.
    refresh() {
      inflightRefresh ??= api<AuthResponse>('/auth/refresh', { method: 'POST' })
        .then((res) => apply(res) && res.accessToken)
        .catch(() => {
          setAccessToken(null);
          set({ user: null });
          return null;
        })
        .finally(() => {
          inflightRefresh = null;
        });
      return inflightRefresh;
    },
  };
});

registerRefresh(() => useAuthStore.getState().refresh());
