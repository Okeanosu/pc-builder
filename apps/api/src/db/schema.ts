import type { Benchmark, BuildLabel, CategoryKey, CompatibilityIssueDTO, SpecField } from '@pc/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const money = (name: string) => bigint(name, { mode: 'number' });
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum('role', ['CUSTOMER', 'STAFF', 'ADMIN']);
export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'HIDDEN']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
]);
export const orderTypeEnum = pgEnum('order_type', ['RETAIL', 'BUILD']);
export const paymentStatusEnum = pgEnum('payment_status', ['UNPAID', 'PAID', 'REFUNDED']);
export const movementReasonEnum = pgEnum('movement_reason', ['IMPORT', 'ORDER', 'CANCEL', 'ADJUST']);
export const buildSourceEnum = pgEnum('build_source', ['CHAT', 'FORM', 'CUSTOM']);
export const chatModeEnum = pgEnum('chat_mode', ['AI', 'FALLBACK']);
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant', 'tool']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: roleEnum('role').notNull().default('CUSTOMER'),
  createdAt: createdAt(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').$type<CategoryKey>().notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  specSchema: jsonb('spec_schema').$type<SpecField[]>().notNull().default([]),
});

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id),
    sku: text('sku').notNull().unique(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    price: money('price').notNull(),
    salePrice: money('sale_price'),
    stock: integer('stock').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    specs: jsonb('specs').$type<Record<string, unknown>>().notNull(),
    description: text('description'),
    status: productStatusEnum('status').notNull().default('ACTIVE'),
    commercialBoost: real('commercial_boost').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('products_specs_gin').using('gin', sql`${t.specs} jsonb_path_ops`),
    index('products_category_price_idx').on(t.categoryId, t.price),
    index('products_name_search_idx').using('gin', sql`to_tsvector('simple', ${t.name})`),
  ],
);

export const benchmarks = pgTable('benchmarks', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  cpuSingle: integer('cpu_single'),
  cpuMulti: integer('cpu_multi'),
  gpuScore: integer('gpu_score'),
  source: text('source'),
  updatedAt: updatedAt(),
});

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: movementReasonEnum('reason').notNull(),
    ref: text('ref'),
    actorId: uuid('actor_id').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index('inventory_movements_product_idx').on(t.productId, t.createdAt)],
);

export const purposeWeights = pgTable('purpose_weights', {
  purpose: text('purpose').primaryKey(),
  weights: jsonb('weights').$type<Record<CategoryKey, number>>().notNull(),
  allocation: jsonb('allocation').$type<Record<CategoryKey, { min: number; max: number }>>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: updatedAt(),
});

export interface StoredBuildItem {
  category: CategoryKey;
  productId: string;
  name: string;
  price: number;
}

export const builds = pgTable(
  'builds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    label: text('label').$type<BuildLabel>(),
    purpose: text('purpose').notNull(),
    budget: money('budget').notNull(),
    items: jsonb('items').$type<StoredBuildItem[]>().notNull(),
    totalPrice: money('total_price').notNull(),
    score: real('score').notNull().default(0),
    scoreBreakdown: jsonb('score_breakdown')
      .$type<Partial<Record<CategoryKey, number>>>()
      .notNull()
      .default({}),
    allocation: jsonb('allocation').$type<Partial<Record<CategoryKey, number>>>().notNull().default({}),
    estimatedWattage: integer('estimated_wattage').notNull().default(0),
    recommendedPsuWattage: integer('recommended_psu_wattage').notNull().default(0),
    warnings: jsonb('warnings').$type<CompatibilityIssueDTO[]>().notNull().default([]),
    source: buildSourceEnum('source').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('builds_user_idx').on(t.userId)],
);

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    qty: integer('qty').notNull(),
    buildId: uuid('build_id').references(() => builds.id),
  },
  // NULLS NOT DISTINCT so retail lines (build_id null) also conflict, which makes ON CONFLICT upserts atomic.
  (t) => [unique('cart_items_cart_product_build_uq').on(t.cartId, t.productId, t.buildId).nullsNotDistinct()],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    userId: uuid('user_id').references(() => users.id),
    /** Anonymous visitor (gid cookie) that placed a guest order; null for account orders. */
    guestId: text('guest_id'),
    type: orderTypeEnum('type').notNull(),
    status: orderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
    buildId: uuid('build_id').references(() => builds.id),
    subtotal: money('subtotal').notNull(),
    assemblyFee: money('assembly_fee').notNull().default(0),
    shippingFee: money('shipping_fee').notNull().default(0),
    total: money('total').notNull(),
    shippingName: text('shipping_name').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    note: text('note'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('orders_user_idx').on(t.userId, t.createdAt),
    index('orders_status_expires_idx').on(t.status, t.expiresAt),
  ],
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  nameSnapshot: text('name_snapshot').notNull(),
  priceSnapshot: money('price_snapshot').notNull(),
  qty: integer('qty').notNull(),
  buildId: uuid('build_id').references(() => builds.id),
});

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Null for bank transfers that matched no order (kept for manual reconciliation). */
    orderId: uuid('order_id').references(() => orders.id),
    provider: text('provider').notNull(),
    amount: money('amount').notNull(),
    transferContent: text('transfer_content'),
    providerTxnId: text('provider_txn_id').unique(),
    raw: jsonb('raw'),
    status: text('status').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('payments_status_created_idx').on(t.status, t.createdAt)],
);

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  guestId: text('guest_id'),
  title: text('title'),
  mode: chatModeEnum('mode').notNull().default('AI'),
  createdAt: createdAt(),
});

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: chatRoleEnum('role').notNull(),
    content: text('content').notNull().default(''),
    toolName: text('tool_name'),
    toolArgs: jsonb('tool_args'),
    toolResult: jsonb('tool_result'),
    buildIds: jsonb('build_ids').$type<string[]>().notNull().default([]),
    mode: chatModeEnum('mode'),
    latencyMs: integer('latency_ms'),
    /** AI-mode assistant rows: VND amounts in the reply that no tool returned (null when not checked). */
    priceCheck: jsonb('price_check').$type<{
      mentions: number;
      unmatched: Array<{ text: string; amount: number }>;
    }>(),
    createdAt: createdAt(),
  },
  (t) => [index('chat_messages_session_idx').on(t.sessionId, t.createdAt)],
);

export type BenchmarkRow = typeof benchmarks.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type BenchmarkValue = Benchmark;
