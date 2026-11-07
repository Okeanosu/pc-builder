import {
  type BuildDTO,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
  formatVnd,
  MAX_BUDGET,
  MIN_BUDGET,
  type Preferences,
  PURPOSES,
  type Purpose,
  preferencesSchema,
} from '@pc/shared';
import type { RecommendToolOutput } from './types';

export type BuildSummary = RecommendToolOutput['builds'][number] & {
  parts: Array<{ category: string; productId: string; name: string; price: number }>;
};

/** What recommend_builds and modify_build hand back to the model: compact summaries, never full specs. */
export interface RecommendForModel extends RecommendToolOutput {
  builds: BuildSummary[];
  budget: number;
  purpose: Purpose;
  /** Things the model must tell the customer (clamped budget, retry hint, relaxed parts). */
  note?: string;
  changedCategories?: string[];
}

export const toolError = (error: string, message: string, extra: Record<string, unknown> = {}) => ({
  error,
  message,
  ...extra,
});

/** Integer from a number or a numeric string (models occasionally quote numbers); undefined otherwise. */
export function toInt(x: unknown): number | undefined {
  const n = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x) : Number.NaN;
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export const toPurpose = (x: unknown): Purpose | undefined =>
  PURPOSES.includes(x as Purpose) ? (x as Purpose) : undefined;

export const toCategory = (x: unknown): CategoryKey | undefined =>
  CATEGORY_KEYS.includes(x as CategoryKey) ? (x as CategoryKey) : undefined;

export const toStringList = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

export const categoryLabel = (c: CategoryKey) => CATEGORY_LABELS[c];

/**
 * Keeps each valid preference field and drops the rest, so one bad value (or an unsupported key such as `rgb`)
 * does not discard the whole object. A top-level `resolution` argument wins over preferences.resolution.
 */
export function sanitizePreferences(raw: unknown, resolution?: unknown): Preferences {
  const source: Record<string, unknown> =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? { ...raw } : {};
  if (resolution !== undefined) source.resolution = resolution;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(preferencesSchema.shape)) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    const parsed = field.safeParse(value);
    if (parsed.success) out[key] = parsed.data;
    else if (typeof value === 'number') {
      const rounded = field.safeParse(Math.round(value));
      if (rounded.success) out[key] = rounded.data;
    }
  }
  return out as Preferences;
}

export function clampBudget(budget: number): { budget: number; note?: string } {
  const clamped = Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Math.round(budget)));
  if (clamped === budget) return { budget };
  const side = budget < MIN_BUDGET ? 'thấp hơn mức tối thiểu' : 'cao hơn mức tối đa';
  return {
    budget: clamped,
    note:
      `Ngân sách ${formatVnd(Math.round(budget))} ${side} hệ thống hỗ trợ ` +
      `(${formatVnd(MIN_BUDGET)} – ${formatVnd(MAX_BUDGET)}), nên đã dùng ${formatVnd(clamped)}. ` +
      'Hãy nói rõ điều này với khách.',
  };
}

const INFEASIBLE_TEXT: Record<string, string> = {
  BUDGET_TOO_LOW: 'Ngân sách thấp hơn giá của cấu hình tương thích rẻ nhất đang còn hàng',
  NO_COMPATIBLE_COMBINATION:
    'Không có tổ hợp linh kiện còn hàng nào đáp ứng đủ các yêu cầu (hãng, kích thước, Wi-Fi, dung lượng...)',
  FIXED_PART_CONFLICT: 'Linh kiện được giữ nguyên không tương thích với các linh kiện còn hàng khác',
  SEARCH_LIMIT: 'Hệ thống tìm kiếm cấu hình mất quá nhiều thời gian nên đã tạm dừng',
};

export const SEARCH_LIMIT_NOTE =
  'Việc tìm cấu hình lần này bị dừng vì quá lâu. Hãy xin lỗi khách và mời khách thử lại sau giây lát, ' +
  'hoặc nới bớt yêu cầu (hãng, màu, kích thước) để em tìm nhanh hơn.';

export const infeasibleText = (reason: string) => INFEASIBLE_TEXT[reason] ?? reason;

export function summarizeBuild(b: BuildDTO): BuildSummary {
  const allocation: Record<string, number> = {};
  for (const [key, share] of Object.entries(b.allocation)) {
    if (typeof share === 'number') allocation[key] = share;
  }
  return {
    id: b.id,
    label: b.label ?? 'balanced',
    totalPrice: b.totalPrice,
    score: b.score,
    parts: b.items.map((i) => ({
      category: i.category,
      productId: i.product.id,
      name: i.product.name,
      price: i.product.salePrice ?? i.product.price,
    })),
    allocation,
    warnings: b.warnings.map((w) => w.message),
  };
}

export const joinNotes = (notes: Array<string | undefined>) => {
  const text = notes.filter(Boolean).join(' ');
  return text ? { note: text } : {};
};
