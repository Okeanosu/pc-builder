import type { CompatibilityResultDTO, Paginated, ProductDTO, ProductSummaryDTO } from '@pc/shared';
import { CATEGORY_KEYS } from '@pc/shared';
import { AppError } from '../../../lib/errors';
import type { CatalogQuery } from '../../catalog';
import { declOf } from './recommend-builds';
import { categoryLabel, toCategory, toInt, toolError, toStringList } from './shared';
import type { ChatTool } from './types';

export const SEARCH_RESULT_LIMIT = 8;
const MAX_CHECK_IDS = 16;
const SPEC_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

const priceOf = (p: { price: number; salePrice: number | null }) => ({
  price: p.salePrice ?? p.price,
  ...(p.salePrice !== null && p.salePrice !== p.price ? { listPrice: p.price } : {}),
});

/** Accepts the declared [{key, value}] list, and tolerates a plain {key: value} object. */
export function parseSpecFilters(raw: unknown): Record<string, string> {
  const pairs: Array<[unknown, unknown]> = Array.isArray(raw)
    ? raw.map((f) => [(f as { key?: unknown })?.key, (f as { value?: unknown })?.value])
    : typeof raw === 'object' && raw !== null
      ? Object.entries(raw)
      : [];
  const out: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (typeof key !== 'string' || !SPEC_KEY.test(key)) continue;
    if (typeof value === 'string' && value.trim() !== '') out[key] = value.trim();
    else if (typeof value === 'number' || typeof value === 'boolean') out[key] = String(value);
  }
  return out;
}

export interface SearchProductsDeps {
  search(q: CatalogQuery): Promise<Paginated<ProductSummaryDTO>>;
}

export function createSearchProductsTool(deps: SearchProductsDeps): ChatTool {
  return {
    decl: declOf('search_products'),
    label: 'Đang tìm linh kiện',
    async run(args) {
      const category = toCategory(args.category);
      if (!category) {
        return {
          forModel: toolError(
            'INVALID_ARGUMENTS',
            `Danh mục phải là một trong: ${CATEGORY_KEYS.join(', ')}.`,
          ),
        };
      }
      const keyword = typeof args.keyword === 'string' ? args.keyword.trim().slice(0, 100) : '';
      const minPrice = toInt(args.minPrice);
      const maxPrice = toInt(args.maxPrice);
      const specs = parseSpecFilters(args.filters);
      let page: Paginated<ProductSummaryDTO>;
      try {
        page = await deps.search({
          category,
          ...(keyword ? { q: keyword } : {}),
          ...(minPrice !== undefined && minPrice >= 0 ? { minPrice } : {}),
          ...(maxPrice !== undefined && maxPrice > 0 ? { maxPrice } : {}),
          ...(Object.keys(specs).length > 0 ? { specs } : {}),
          inStock: true,
          sort: 'performance',
          page: 1,
          pageSize: SEARCH_RESULT_LIMIT,
        });
      } catch (err) {
        if (err instanceof AppError && err.status === 422) {
          return { forModel: toolError('INVALID_FILTER', err.message) };
        }
        throw err;
      }
      const products = page.items;
      return {
        forModel: {
          total: page.total,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            ...priceOf(p),
            keySpecs: p.keySpecs,
          })),
          ...(products.length === 0
            ? {
                message: 'Không có sản phẩm còn hàng phù hợp; hãy gợi ý khách nới khoảng giá hoặc điều kiện.',
              }
            : {}),
        },
        events: products.length > 0 ? [{ type: 'products', products }] : [],
      };
    },
  };
}

export interface ProductDetailsDeps {
  getProduct(id: string): Promise<ProductDTO | null>;
}

export function createProductDetailsTool(deps: ProductDetailsDeps): ChatTool {
  return {
    decl: declOf('get_product_details'),
    label: 'Đang xem thông số sản phẩm',
    async run(args) {
      const id = typeof args.productId === 'string' ? args.productId.trim() : '';
      const p = id ? await deps.getProduct(id) : null;
      if (!p) return { forModel: toolError('NOT_FOUND', 'Không tìm thấy sản phẩm với ID này.') };
      return {
        forModel: {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          ...priceOf(p),
          stock: p.stock,
          inStock: p.stock > 0,
          specs: p.specs,
          benchmark: p.benchmark,
        },
      };
    },
  };
}

export interface CheckCompatibilityDeps {
  check(productIds: string[]): Promise<CompatibilityResultDTO>;
  findProducts(ids: string[]): Promise<ProductSummaryDTO[]>;
}

function compatibilitySummary(result: CompatibilityResultDTO): string {
  const errors = result.issues.filter((i) => i.severity === 'error').length;
  const warnings = result.issues.length - errors;
  if (result.issues.length === 0) return 'Các linh kiện tương thích với nhau.';
  const parts = [
    errors > 0 ? `${errors} lỗi không tương thích` : '',
    warnings > 0 ? `${warnings} cảnh báo` : '',
  ];
  return `Có ${parts.filter(Boolean).join(' và ')}.`;
}

export function createCheckCompatibilityTool(deps: CheckCompatibilityDeps): ChatTool {
  return {
    decl: declOf('check_compatibility'),
    label: 'Đang kiểm tra tương thích',
    async run(args) {
      const ids = [...new Set(toStringList(args.productIds).map((s) => s.trim()))];
      if (ids.length === 0 || ids.length > MAX_CHECK_IDS) {
        return {
          forModel: toolError('INVALID_ARGUMENTS', `Cần từ 1 đến ${MAX_CHECK_IDS} ID sản phẩm để kiểm tra.`),
        };
      }
      let result: CompatibilityResultDTO;
      try {
        result = await deps.check(ids);
      } catch (err) {
        if (err instanceof AppError && err.code === 'NOT_FOUND') {
          return {
            forModel: toolError('NOT_FOUND', 'Có sản phẩm không tồn tại; hãy tra lại bằng search_products.', {
              missing: (err.details as { missing?: string[] } | undefined)?.missing ?? [],
            }),
          };
        }
        if (err instanceof AppError && err.code === 'DUPLICATE_CATEGORY') {
          return {
            forModel: toolError('DUPLICATE_CATEGORY', 'Mỗi danh mục chỉ được có một linh kiện.', {
              categories: (err.details as { categories?: string[] } | undefined)?.categories ?? [],
            }),
          };
        }
        throw err;
      }
      const parts = await deps.findProducts(ids);
      const present = new Set(parts.map((p) => p.category));
      return {
        forModel: {
          ok: result.ok,
          summary: compatibilitySummary(result),
          issues: result.issues,
          estimatedWattage: result.estimatedWattage,
          recommendedPsuWattage: result.recommendedPsuWattage,
          parts: parts.map((p) => ({ id: p.id, category: p.category, name: p.name, ...priceOf(p) })),
          missingCategories: CATEGORY_KEYS.filter((c) => !present.has(c)).map(categoryLabel),
        },
      };
    },
  };
}
