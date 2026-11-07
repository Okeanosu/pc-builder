import { type CompatibilityReport, checkCompatibility, type EngineProduct, type PartMap } from '@pc/engine';
import type { CategoryKey, CompatibilityResultDTO, Purpose } from '@pc/shared';
import type { Db } from '../../db/client';
import { AppError } from '../../lib/errors';
import { findProductsByIds, type ProductWithRefs, toEngineProduct } from '../../lib/products';
import type { Redis } from '../../lib/redis';
import { createCatalogService, isUuid } from '../catalog';

export interface LoadedParts {
  parts: PartMap;
  rows: ProductWithRefs[];
}

/** Loads products into a one-per-category part map; 404 lists unknown ids, 422 lists doubled categories. */
export async function loadParts(db: Db, productIds: string[]): Promise<LoadedParts> {
  const ids = [...new Set(productIds)];
  const rows = await findProductsByIds(db, ids.filter(isUuid));
  const found = new Set(rows.map((r) => r.product.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new AppError(404, 'NOT_FOUND', 'Có sản phẩm không tồn tại', { missing });
  }
  const parts: PartMap = {};
  const doubled = new Set<CategoryKey>();
  for (const row of rows) {
    if (parts[row.categoryKey]) doubled.add(row.categoryKey);
    parts[row.categoryKey] = toEngineProduct(row);
  }
  if (doubled.size > 0) {
    throw new AppError(422, 'DUPLICATE_CATEGORY', 'Mỗi danh mục chỉ được chọn một linh kiện', {
      categories: [...doubled],
    });
  }
  return { parts, rows };
}

export const toCompatibilityResult = (report: CompatibilityReport): CompatibilityResultDTO => ({
  ok: !report.issues.some((i) => i.severity === 'error'),
  issues: report.issues.map(({ code, severity, message, categories }) => ({
    code,
    severity,
    message,
    categories,
  })),
  estimatedWattage: report.estimatedWattage,
  recommendedPsuWattage: report.recommendedPsuWattage,
});

/** The engine catalog plus any chosen part missing from it (e.g. out of stock), so scores and tiers can rank it. */
export function referenceCatalog(catalog: EngineProduct[], parts: PartMap): EngineProduct[] {
  const known = new Set(catalog.map((p) => p.id));
  const extra = Object.values(parts).filter((p) => !known.has(p.id));
  return extra.length > 0 ? [...catalog, ...extra] : catalog;
}

export interface CheckContext {
  /** Enables the CPU–GPU balance warning when 'gaming'. */
  purpose?: Purpose;
  /** Enables the budget rule. */
  budget?: number;
}

export function createCompatibilityService(deps: { db: Db; redis: Redis }) {
  const catalog = createCatalogService(deps);

  return {
    async check(productIds: string[], ctx: CheckContext = {}): Promise<CompatibilityResultDTO> {
      const { parts } = await loadParts(deps.db, productIds);
      const reference =
        ctx.purpose === 'gaming' ? referenceCatalog(await catalog.getEngineCatalog(), parts) : undefined;
      const report = checkCompatibility(parts, {
        purpose: ctx.purpose,
        budget: ctx.budget,
        catalog: reference,
      });
      return toCompatibilityResult(report);
    },
  };
}

export type CompatibilityService = ReturnType<typeof createCompatibilityService>;
