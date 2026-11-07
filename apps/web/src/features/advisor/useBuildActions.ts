'use client';

import type { BuildDTO, CartDTO } from '@pc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { API_URL, ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

export const quotePdfUrl = (buildId: string) => `${API_URL}/quotes/builds/${encodeURIComponent(buildId)}.pdf`;

export function shareUrl(buildId: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/builds/${encodeURIComponent(buildId)}`;
}

/** Copies the public link of a saved build; falls back to showing it when the clipboard is blocked. */
export async function copyShareLink(buildId: string): Promise<void> {
  const url = shareUrl(buildId);
  try {
    await navigator.clipboard.writeText(url);
    toast({ tone: 'success', title: 'Đã sao chép liên kết chia sẻ cấu hình', description: url });
  } catch {
    toast({ tone: 'info', title: 'Sao chép liên kết này để chia sẻ', description: url, duration: 10_000 });
  }
}

export function cartErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.status >= 500) return 'Máy chủ đang bận. Thử lại sau ít giây.';
    if (err.code === 'OUT_OF_STOCK' || err.code === 'INSUFFICIENT_STOCK') {
      return 'Một linh kiện vừa hết hàng. Mở cấu hình trong Customizer để đổi linh kiện khác.';
    }
    return err.message;
  }
  return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
}

/** POST /cart/builds/:id, then refresh the cart badge and confirm with a toast. */
export function useAddBuildToCart() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (build: Pick<BuildDTO, 'id'>) =>
      api<CartDTO>(`/cart/builds/${encodeURIComponent(build.id)}`, { method: 'POST' }),
    onSuccess: (_cart, build) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      const full = build as Partial<BuildDTO>;
      toast({
        tone: 'success',
        title: 'Đã thêm cả bộ vào giỏ hàng',
        description:
          full.items && full.totalPrice !== undefined
            ? `${full.items.length} linh kiện · ${formatVnd(full.totalPrice)}`
            : undefined,
        action: { label: 'Xem giỏ hàng', altText: 'Mở giỏ hàng', onClick: () => router.push('/cart') },
      });
    },
    onError: (err) => {
      toast({ tone: 'error', title: 'Chưa thêm được vào giỏ', description: cartErrorText(err) });
    },
  });
}
