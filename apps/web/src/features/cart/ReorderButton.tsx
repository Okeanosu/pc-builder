'use client';

import type { OrderItemDTO } from '@pc/shared';
import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useReorder } from './hooks';

/** Re-adds an order's items to the cart (prices and stock are re-checked there) and opens the cart. */
export function ReorderButton({
  items,
  ...props
}: { items?: readonly OrderItemDTO[] } & Omit<ButtonProps, 'onClick'>) {
  const router = useRouter();
  const reorder = useReorder();
  return (
    <Button
      {...props}
      disabled={!items?.length}
      loading={reorder.isPending}
      onClick={() =>
        items &&
        reorder.mutate(items, {
          onSuccess: () => {
            toast({ title: 'Đã thêm lại sản phẩm vào giỏ', tone: 'success' });
            router.push('/cart');
          },
        })
      }
    >
      {!reorder.isPending && <RotateCcw aria-hidden />}
      Đặt lại đơn này
    </Button>
  );
}
