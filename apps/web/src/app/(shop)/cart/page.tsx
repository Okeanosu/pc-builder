import type { Metadata } from 'next';
import { CartView } from '@/features/cart/CartView';

export const metadata: Metadata = { title: 'Giỏ hàng', robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
