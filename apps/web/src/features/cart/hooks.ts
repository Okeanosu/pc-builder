'use client';

import type { BuildDTO, CartDTO, OrderItemDTO } from '@pc/shared';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '../auth/form-errors';

/** The cart belongs to the signed-in user or to the guest cookie, so wait until auth has settled. */
export function useCart() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: () => api<CartDTO>('/cart'),
    enabled: status === 'ready',
    staleTime: 15_000,
  });
}

export function useBuilds(ids: readonly string[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.build(id),
      queryFn: () => api<BuildDTO>(`/builds/${id}`),
      staleTime: 5 * 60_000,
    })),
  });
  return useMemo(() => {
    const byId = new Map<string, BuildDTO>();
    for (const r of results) if (r.data) byId.set(r.data.id, r.data);
    return { byId, loading: results.some((r) => r.isPending) };
  }, [results]);
}

function useCartMutation<V>(mutationFn: (vars: V) => Promise<CartDTO>, errorTitle: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (cart) => qc.setQueryData(queryKeys.cart, cart),
    onError: (error) => {
      toast({ title: errorTitle, description: apiErrorMessage(error), tone: 'error' });
      void qc.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}

export const useAddToCart = () =>
  useCartMutation(
    ({ productId, qty }: { productId: string; qty: number }) =>
      api<CartDTO>('/cart/items', { method: 'POST', json: { productId, qty } }),
    'Chưa thêm được vào giỏ',
  );

export const useUpdateCartItem = () =>
  useCartMutation(
    ({ id, qty }: { id: string; qty: number }) =>
      api<CartDTO>(`/cart/items/${id}`, { method: 'PATCH', json: { qty } }),
    'Chưa đổi được số lượng',
  );

export const useRemoveCartItem = () =>
  useCartMutation(
    (id: string) => api<CartDTO>(`/cart/items/${id}`, { method: 'DELETE' }),
    'Chưa xóa được sản phẩm',
  );

export const useAddBuildToCart = () =>
  useCartMutation(
    (buildId: string) => api<CartDTO>(`/cart/builds/${buildId}`, { method: 'POST' }),
    'Chưa thêm được cấu hình vào giỏ',
  );

/** Puts an expired or cancelled order back into the cart: build parts as their build, the rest line by line. */
export function useReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: readonly OrderItemDTO[]) => {
      let cart: CartDTO | undefined;
      for (const buildId of new Set(items.flatMap((i) => (i.buildId ? [i.buildId] : [])))) {
        cart = await api<CartDTO>(`/cart/builds/${buildId}`, { method: 'POST' });
      }
      for (const i of items.filter((x) => !x.buildId)) {
        cart = await api<CartDTO>('/cart/items', {
          method: 'POST',
          json: { productId: i.productId, qty: i.qty },
        });
      }
      return cart;
    },
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(queryKeys.cart, cart);
    },
    onError: (error) => {
      toast({ title: 'Chưa đặt lại được toàn bộ', description: apiErrorMessage(error), tone: 'error' });
      void qc.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}
