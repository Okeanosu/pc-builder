'use client';

import type { BuildDTO, OrderDTO, Paginated } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';

export function useMyOrders(page: number, pageSize = 10) {
  const signedIn = useAuthStore((s) => Boolean(s.user));
  return useQuery({
    queryKey: [...queryKeys.myOrders, page, pageSize],
    queryFn: () => api<Paginated<OrderDTO>>(`/me/orders?page=${page}&pageSize=${pageSize}`),
    enabled: signedIn,
    placeholderData: keepPreviousData,
  });
}

export function useMyBuilds() {
  const signedIn = useAuthStore((s) => Boolean(s.user));
  return useQuery({
    queryKey: queryKeys.myBuilds,
    queryFn: () => api<BuildDTO[]>('/me/builds'),
    enabled: signedIn,
  });
}
