'use client';

import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAddToCart } from './hooks';

interface AddToCartButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  product: { id: string; name: string; stock: number };
  qty?: number;
  /** `icon` for cards: a square cart button with an accessible name. */
  compact?: boolean;
}

export function AddToCartButton({
  product,
  qty = 1,
  compact,
  size,
  variant,
  ...props
}: AddToCartButtonProps) {
  const add = useAddToCart();
  const router = useRouter();
  const out = product.stock <= 0;

  const onClick = () =>
    add.mutate(
      { productId: product.id, qty },
      {
        onSuccess: () =>
          toast({
            title: 'Đã thêm vào giỏ hàng',
            description: qty > 1 ? `${qty} × ${product.name}` : product.name,
            tone: 'success',
            action: { label: 'Xem giỏ', altText: 'Mở giỏ hàng', onClick: () => router.push('/cart') },
          }),
      },
    );

  if (compact) {
    return (
      <Button
        size={size ?? 'icon-sm'}
        variant={variant ?? 'secondary'}
        onClick={onClick}
        loading={add.isPending}
        disabled={out}
        aria-label={out ? `${product.name} đã hết hàng` : `Thêm ${product.name} vào giỏ`}
        title={out ? 'Hết hàng' : 'Thêm vào giỏ'}
        {...props}
      >
        {!add.isPending && <ShoppingCart aria-hidden />}
      </Button>
    );
  }

  return (
    <Button size={size} variant={variant} onClick={onClick} loading={add.isPending} disabled={out} {...props}>
      {!add.isPending && <ShoppingCart aria-hidden />}
      {out ? 'Hết hàng' : 'Thêm vào giỏ'}
    </Button>
  );
}
