import type { EngineProduct } from '@pc/engine';
import type { AnySpecs, CategoryKey, ProductDTO, ProductSummaryDTO } from '@pc/shared';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { benchmarks, brands, categories, products } from '../db/schema';

/** Headline specs shown on product cards, in display order. */
export const KEY_SPECS: Record<CategoryKey, string[]> = {
  cpu: ['socket', 'cores', 'threads', 'boostClockGHz'],
  mainboard: ['socket', 'chipset', 'formFactor', 'memoryType'],
  ram: ['type', 'capacityGB', 'speedMHz'],
  gpu: ['chipset', 'vramGB', 'lengthMm'],
  storage: ['interface', 'capacityGB', 'readMBps'],
  psu: ['wattage', 'efficiency', 'modular'],
  case: ['supportedFormFactors', 'maxGpuLengthMm', 'color'],
  cooler: ['type', 'tdpRatingW', 'color'],
};

export const productWithRefsColumns = {
  product: products,
  brandName: brands.name,
  categoryKey: categories.key,
  benchmark: benchmarks,
};

export interface ProductWithRefs {
  product: typeof products.$inferSelect;
  brandName: string;
  categoryKey: CategoryKey;
  benchmark: typeof benchmarks.$inferSelect | null;
}

export function baseProductQuery(db: Db) {
  return db
    .select(productWithRefsColumns)
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(benchmarks, eq(benchmarks.productId, products.id));
}

export async function findProductsByIds(db: Db, ids: string[]): Promise<ProductWithRefs[]> {
  if (ids.length === 0) return [];
  return baseProductQuery(db).where(inArray(products.id, ids));
}

/** Units customers can still buy: on-hand stock minus units held by unpaid orders. */
export const availableStock = (p: { stock: number; reserved: number }) => Math.max(0, p.stock - p.reserved);

function pickKeySpecs(category: CategoryKey, specs: Record<string, unknown>): ProductSummaryDTO['keySpecs'] {
  const out: ProductSummaryDTO['keySpecs'] = {};
  for (const key of KEY_SPECS[category]) {
    const v = specs[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[key] = v;
    else if (Array.isArray(v)) out[key] = v.join('/');
  }
  return out;
}

export function toProductSummary(row: ProductWithRefs): ProductSummaryDTO {
  const p = row.product;
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    brand: row.brandName,
    category: row.categoryKey,
    price: p.price,
    salePrice: p.salePrice,
    stock: availableStock(p),
    image: p.images[0] ?? null,
    keySpecs: pickKeySpecs(row.categoryKey, p.specs),
  };
}

export function toProductDTO(row: ProductWithRefs): ProductDTO {
  const b = row.benchmark;
  return {
    ...toProductSummary(row),
    images: row.product.images,
    specs: row.product.specs as unknown as AnySpecs,
    benchmark: b
      ? {
          cpuSingle: b.cpuSingle ?? undefined,
          cpuMulti: b.cpuMulti ?? undefined,
          gpuScore: b.gpuScore ?? undefined,
        }
      : null,
    description: row.product.description,
    commercialBoost: row.product.commercialBoost,
  };
}

/** Price the customer pays now (sale price wins). */
export const effectivePrice = (p: { price: number; salePrice: number | null }) => p.salePrice ?? p.price;

export function toEngineProduct(row: ProductWithRefs): EngineProduct {
  const b = row.benchmark;
  return {
    id: row.product.id,
    category: row.categoryKey,
    name: row.product.name,
    brand: row.brandName,
    price: effectivePrice(row.product),
    stock: availableStock(row.product),
    specs: row.product.specs as unknown as AnySpecs,
    benchmark: b
      ? {
          cpuSingle: b.cpuSingle ?? undefined,
          cpuMulti: b.cpuMulti ?? undefined,
          gpuScore: b.gpuScore ?? undefined,
        }
      : undefined,
    commercialBoost: row.product.commercialBoost,
  };
}
