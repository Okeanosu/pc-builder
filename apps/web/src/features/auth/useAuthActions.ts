'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';

/** Auth store actions plus the cache work that must follow them: carts merge on login, per-user data goes on logout. */
export function useAuthActions() {
  const qc = useQueryClient();
  const store = useAuthStore();

  const dropPersonal = useCallback(() => {
    qc.removeQueries({ queryKey: queryKeys.myOrders });
    qc.removeQueries({ queryKey: queryKeys.myBuilds });
    qc.removeQueries({ queryKey: ['order'] });
    qc.removeQueries({ queryKey: ['payment'] });
  }, [qc]);

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await store.login(email, password);
      dropPersonal();
      await qc.invalidateQueries({ queryKey: queryKeys.cart });
      return user;
    },
    [store, qc, dropPersonal],
  );

  const register = useCallback(
    async (input: Parameters<typeof store.register>[0]) => {
      const user = await store.register(input);
      dropPersonal();
      await qc.invalidateQueries({ queryKey: queryKeys.cart });
      return user;
    },
    [store, qc, dropPersonal],
  );

  const logout = useCallback(async () => {
    await store.logout();
    dropPersonal();
    await qc.invalidateQueries({ queryKey: queryKeys.cart });
  }, [store, qc, dropPersonal]);

  return { login, register, logout };
}
