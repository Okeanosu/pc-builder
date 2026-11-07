import { z } from 'zod';
import { CATEGORY_KEYS, MAX_BUDGET, MIN_BUDGET, ORDER_STATUSES, PURPOSES } from './constants';
import { FORM_FACTORS, GPU_BRANDS } from './specs';

export const preferencesSchema = z.object({
  cpuBrand: z.enum(['AMD', 'Intel']).optional(),
  gpuBrand: z.enum(GPU_BRANDS).optional(),
  color: z.enum(['black', 'white']).optional(),
  formFactor: z.enum(FORM_FACTORS).optional(),
  minRamGB: z.number().int().positive().optional(),
  minStorageGB: z.number().int().positive().optional(),
  needWifi: z.boolean().optional(),
  resolution: z.enum(['1080p', '1440p', '4k']).optional(),
  requireDiscreteGpu: z.boolean().optional(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

const categoryKey = z.enum(CATEGORY_KEYS);

export const recommendationRequestSchema = z.object({
  budget: z.number().int().min(MIN_BUDGET).max(MAX_BUDGET),
  purpose: z.enum(PURPOSES),
  preferences: preferencesSchema.optional(),
  fixed: z.partialRecord(categoryKey, z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const compatibilityCheckSchema = z.object({
  productIds: z.array(z.string()).min(1).max(16),
});

export const productQuerySchema = z.object({
  category: categoryKey.optional(),
  q: z.string().trim().max(100).optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  inStock: z.coerce.boolean().optional(),
  /** specs[socket]=AM5&specs[wifi]=true → matched with JSONB containment */
  specs: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name', 'performance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ')
    .optional(),
});
export const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addCartItemSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).max(20).default(1),
});
export const updateCartItemSchema = z.object({ qty: z.number().int().min(1).max(20) });

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().trim().min(10).max(300),
  note: z.string().trim().max(500).optional(),
  /** When set, the order is an assembled build (assembly fee applies). */
  buildId: z.string().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const chatMessageSchema = z.object({ text: z.string().trim().min(1).max(1000) });

export const purposeWeightsSchema = z.object({
  weights: z.record(categoryKey, z.number().min(0).max(1)),
  allocation: z.record(
    categoryKey,
    z.object({ min: z.number().min(0).max(1), max: z.number().min(0).max(1) }),
  ),
});
