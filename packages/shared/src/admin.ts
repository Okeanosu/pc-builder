import { z } from 'zod';
import type { CategoryKey, ChatMode, OrderStatus, Purpose } from './constants';
import type { OrderDTO, ProductDTO } from './dto';

export const PRODUCT_STATUSES = ['ACTIVE', 'HIDDEN'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const productFields = {
  categoryId: z.guid(),
  /** Brand name; created on the fly if it does not exist yet. */
  brand: z.string().trim().min(1).max(60),
  sku: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z0-9-]+$/, 'SKU chỉ gồm chữ, số và dấu gạch ngang'),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không hợp lệ')
    .optional(),
  name: z.string().trim().min(2).max(200),
  price: z.number().int().positive(),
  salePrice: z.number().int().positive().nullable().optional(),
  images: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  specs: z.record(z.string(), z.unknown()),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  commercialBoost: z.number().min(-0.5).max(0.5).optional(),
};

/** Stock is only set at creation; afterwards it changes through inventory adjustments (audited). */
export const adminProductCreateSchema = z.object({
  ...productFields,
  stock: z.number().int().min(0).max(100_000).optional(),
});
export const adminProductPatchSchema = z.object(productFields).partial();
export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductPatchInput = z.infer<typeof adminProductPatchSchema>;

export const specFieldSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Khóa chỉ gồm chữ và số, bắt đầu bằng chữ'),
  label: z.string().trim().min(1).max(80),
  type: z.enum(['number', 'string', 'boolean', 'enum', 'enum[]', 'number[]']),
  unit: z.string().trim().max(20).optional(),
  options: z.array(z.string().trim().min(1)).max(50).optional(),
  required: z.boolean(),
  filterable: z.boolean(),
});
export const categorySpecSchemaInput = z
  .array(specFieldSchema)
  .min(1)
  .max(40)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((f, i) => {
      if (seen.has(f.key)) ctx.addIssue({ code: 'custom', path: [i, 'key'], message: 'Khóa bị trùng' });
      seen.add(f.key);
      if ((f.type === 'enum' || f.type === 'enum[]') && !f.options?.length) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'options'],
          message: 'Kiểu lựa chọn cần danh sách giá trị',
        });
      }
    });
  });

export const inventoryAdjustSchema = z
  .object({
    delta: z
      .number()
      .int()
      .refine((n) => n !== 0, 'Số lượng thay đổi phải khác 0'),
    reason: z.enum(['IMPORT', 'ADJUST']),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.reason !== 'IMPORT' || v.delta > 0, {
    path: ['delta'],
    message: 'Nhập kho phải là số dương',
  });
export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;

const score = z.number().int().positive().nullable().optional();
export const benchmarkInputSchema = z.object({
  cpuSingle: score,
  cpuMulti: score,
  gpuScore: score,
  source: z.string().trim().max(100).nullable().optional(),
});

export interface AdminProductDTO extends ProductDTO {
  status: ProductStatus;
  categoryId: string;
  /** Physical units on hand; `stock` (inherited) is what customers can still buy. */
  stockOnHand: number;
  reserved: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementReason = 'IMPORT' | 'ORDER' | 'CANCEL' | 'ADJUST';

export interface InventoryMovementDTO {
  id: string;
  productId: string;
  delta: number;
  reason: MovementReason;
  /** Order code for ORDER/CANCEL, free-text note for manual adjustments. */
  ref: string | null;
  actor: { id: string; email: string; fullName: string } | null;
  createdAt: string;
}

export interface BenchmarkDTO {
  productId: string;
  productName: string;
  category: CategoryKey;
  cpuSingle: number | null;
  cpuMulti: number | null;
  gpuScore: number | null;
  source: string | null;
  updatedAt: string | null;
}

export interface PurposeWeightsDTO {
  purpose: Purpose;
  weights: Record<CategoryKey, number>;
  allocation: Record<CategoryKey, { min: number; max: number }>;
  updatedBy: string | null;
  updatedAt: string;
}

export interface AdminPaymentDTO {
  id: string;
  orderCode: string;
  provider: string;
  amount: number;
  transferContent: string | null;
  providerTxnId: string | null;
  /** SUCCESS | UNDERPAID | MANUAL_REVIEW */
  status: string;
  createdAt: string;
}

export interface AdminOrderDetailDTO extends OrderDTO {
  userEmail: string | null;
  payments: AdminPaymentDTO[];
}

export interface AdminSummaryDTO {
  todayRevenue: number;
  todayOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  lowStockCount: number;
  chatSessionsLast7Days: number;
}

export interface ChatLogSummaryDTO {
  id: string;
  title: string | null;
  mode: ChatMode;
  userEmail: string | null;
  guestId: string | null;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ChatLogMessageDTO {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName: string | null;
  toolArgs: unknown;
  toolResult: unknown;
  buildIds: string[];
  mode: ChatMode | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface ChatLogDetailDTO extends ChatLogSummaryDTO {
  messages: ChatLogMessageDTO[];
}
