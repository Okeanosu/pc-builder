'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { dropPersonalQueries, sessionEnded } from './personal-cache';

/**
 * Clears per-user caches whenever the session ends, including a failed token refresh that signs the
 * user out without going through logout. The cart is refetched so the guest cart takes its place.
 */
export function AuthCacheSync() {
  const qc = useQueryClient();
  useEffect(
    () =>
      useAuthStore.subscribe((state, prev) => {
        if (!sessionEnded(prev, state)) return;
        dropPersonalQueries(qc);
        void qc.invalidateQueries({ queryKey: queryKeys.cart });
      }),
    [qc],
  );
  return null;
}
