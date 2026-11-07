import type {
  AdminOrderDetailDTO,
  AdminProductCreateInput,
  AdminProductDTO,
  AdminProductPatchInput,
  AdminSummaryDTO,
  BenchmarkDTO,
  CategoryDTO,
  CategoryKey,
  ChatLogDetailDTO,
  ChatLogSummaryDTO,
  ChatMode,
  InventoryAdjustInput,
  InventoryMovementDTO,
  OrderDTO,
  OrderStatus,
  OrderType,
  Paginated,
  ProductStatus,
  Purpose,
  PurposeWeightsDTO,
  RevenuePointDTO,
  SpecField,
} from '@pc/shared';
import { api } from '@/lib/api';

type QueryValue = string | number | boolean | null | undefined;

/** Builds `?a=1&b=x`, dropping empty values so the server applies its own defaults. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export type RevenueGroupBy = 'day' | 'week' | 'month';

export interface RevenueQuery {
  from?: string;
  to?: string;
  groupBy: RevenueGroupBy;
}

export interface AdminProductQuery {
  page?: number;
  pageSize?: number;
  category?: CategoryKey;
  q?: string;
  status?: ProductStatus;
  lowStock?: boolean;
}

export interface AdminOrderQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  type?: OrderType;
  q?: string;
}

export interface AdminChatQuery {
  page?: number;
  pageSize?: number;
  mode?: ChatMode;
}

export interface BenchmarkInput {
  cpuSingle?: number | null;
  cpuMulti?: number | null;
  gpuScore?: number | null;
  source?: string | null;
}

export interface WeightsInput {
  weights: PurposeWeightsDTO['weights'];
  allocation: PurposeWeightsDTO['allocation'];
}

export const adminApi = {
  categories: () => api<CategoryDTO[]>('/categories'),
  summary: () => api<AdminSummaryDTO>('/admin/stats/summary'),
  revenue: (q: RevenueQuery) => api<RevenuePointDTO[]>(`/admin/stats/revenue${toQueryString({ ...q })}`),

  products: (q: AdminProductQuery) =>
    api<Paginated<AdminProductDTO>>(`/admin/products${toQueryString({ ...q })}`),
  product: (id: string) => api<AdminProductDTO>(`/admin/products/${id}`),
  createProduct: (input: AdminProductCreateInput) =>
    api<AdminProductDTO>('/admin/products', { method: 'POST', json: input }),
  updateProduct: (id: string, patch: AdminProductPatchInput) =>
    api<AdminProductDTO>(`/admin/products/${id}`, { method: 'PATCH', json: patch }),
  hideProduct: (id: string) => api<AdminProductDTO>(`/admin/products/${id}`, { method: 'DELETE' }),
  setCategorySchema: (categoryId: string, fields: SpecField[]) =>
    api<CategoryDTO>(`/admin/categories/${categoryId}/schema`, { method: 'PUT', json: fields }),

  adjustStock: (productId: string, input: InventoryAdjustInput) =>
    api<{ product: AdminProductDTO; movement: InventoryMovementDTO }>(
      `/admin/inventory/${productId}/adjust`,
      { method: 'POST', json: input },
    ),
  movements: (productId: string, page: number, pageSize = 20) =>
    api<Paginated<InventoryMovementDTO>>(
      `/admin/inventory/${productId}/movements${toQueryString({ page, pageSize })}`,
    ),

  benchmarks: (category?: CategoryKey) =>
    api<BenchmarkDTO[]>(`/admin/benchmarks${toQueryString({ category })}`),
  putBenchmark: (productId: string, input: BenchmarkInput) =>
    api<BenchmarkDTO>(`/admin/benchmarks/${productId}`, { method: 'PUT', json: input }),

  weights: () => api<PurposeWeightsDTO[]>('/admin/weights'),
  putWeights: (purpose: Purpose, input: WeightsInput) =>
    api<PurposeWeightsDTO>(`/admin/weights/${purpose}`, { method: 'PUT', json: input }),

  orders: (q: AdminOrderQuery) => api<Paginated<OrderDTO>>(`/admin/orders${toQueryString({ ...q })}`),
  order: (code: string) => api<AdminOrderDetailDTO>(`/admin/orders/${encodeURIComponent(code)}`),
  setOrderStatus: (code: string, status: OrderStatus) =>
    api<OrderDTO>(`/admin/orders/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      json: { status },
    }),

  chats: (q: AdminChatQuery) => api<Paginated<ChatLogSummaryDTO>>(`/admin/chats${toQueryString({ ...q })}`),
  chat: (id: string) => api<ChatLogDetailDTO>(`/admin/chats/${id}`),
};
