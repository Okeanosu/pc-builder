import type { PartMap } from '@pc/engine';
import { type BuildDTO, CATEGORY_KEYS, type ProductSummaryDTO, type Purpose } from '@pc/shared';
import type { builds, StoredBuildItem } from '../../db/schema';
import { type ProductWithRefs, toProductSummary } from '../../lib/products';

export type BuildRow = typeof builds.$inferSelect;

/** Snapshot of the chosen parts (name and price at save time), in category order. */
export function storedItems(parts: PartMap): StoredBuildItem[] {
  return CATEGORY_KEYS.flatMap((category) => {
    const p = parts[category];
    return p ? [{ category, productId: p.id, name: p.name, price: p.price }] : [];
  });
}

function snapshotSummary(item: StoredBuildItem): ProductSummaryDTO {
  return {
    id: item.productId,
    slug: '',
    sku: '',
    name: item.name,
    brand: '',
    category: item.category,
    price: item.price,
    salePrice: null,
    stock: 0,
    image: null,
    keySpecs: {},
  };
}

/**
 * Items carry the products as they are now (price, stock); totals, score and warnings are the values stored when
 * the build was made. A product that no longer exists falls back to its stored snapshot with zero stock.
 */
export function toBuildDTO(row: BuildRow, productsById: ReadonlyMap<string, ProductWithRefs>): BuildDTO {
  return {
    id: row.id,
    name: row.name,
    label: row.label ?? null,
    purpose: row.purpose as Purpose,
    budget: row.budget,
    source: row.source,
    items: row.items.map((item) => {
      const current = productsById.get(item.productId);
      return {
        category: item.category,
        product: current ? toProductSummary(current) : snapshotSummary(item),
      };
    }),
    totalPrice: row.totalPrice,
    score: row.score,
    scoreBreakdown: row.scoreBreakdown,
    allocation: row.allocation,
    estimatedWattage: row.estimatedWattage,
    recommendedPsuWattage: row.recommendedPsuWattage,
    warnings: row.warnings,
    createdAt: row.createdAt.toISOString(),
  };
}
