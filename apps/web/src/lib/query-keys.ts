import type { ProductQuery } from '@pc/shared';

/** Single source of TanStack Query keys so features can invalidate each other's data. */
export const queryKeys = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  facets: (category: string) => ['facets', category] as const,
  products: (q: Partial<ProductQuery>) => ['products', q] as const,
  product: (slug: string) => ['product', slug] as const,
  cart: ['cart'] as const,
  build: (id: string) => ['build', id] as const,
  myBuilds: ['my-builds'] as const,
  myOrders: ['my-orders'] as const,
  order: (code: string) => ['order', code] as const,
  payment: (code: string) => ['payment', code] as const,
  chatSession: (id: string) => ['chat-session', id] as const,
  admin: {
    summary: ['admin', 'summary'] as const,
    revenue: (range: string) => ['admin', 'revenue', range] as const,
    products: (q: unknown) => ['admin', 'products', q] as const,
    orders: (q: unknown) => ['admin', 'orders', q] as const,
    weights: ['admin', 'weights'] as const,
    chats: (q: unknown) => ['admin', 'chats', q] as const,
  },
};
