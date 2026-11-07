import type { EngineProduct } from '@pc/engine';
import type {
  CategoryDTO,
  CategoryKey,
  FacetDTO,
  Paginated,
  ProductDTO,
  ProductSummaryDTO,
  SpecField,
} from '@pc/shared';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { getCatalogVersion } from '../../lib/catalog-version';
import { toEngineProduct, toProductDTO, toProductSummary } from '../../lib/products';
import type { Redis } from '../../lib/redis';
import { type CatalogQuery, sortFacetValues } from './catalog.filters';
import {
  type CategoryRow,
  facetCounts,
  findActiveProduct,
  findBuyableProducts,
  findCategoryRow,
  listCategoryRows,
  productSearchQueries,
} from './catalog.repository';

export const ENGINE_CATALOG_TTL_SECONDS = 300;
export const engineCatalogKey = (version: number) => `cache:candidates:v${version}`;

export const isUuid = (s: string) => z.guid().safeParse(s).success;

const toCategoryDTO = (c: CategoryRow): CategoryDTO => ({
  id: c.id,
  key: c.key,
  slug: c.slug,
  name: c.name,
  specSchema: c.specSchema,
});

/** Spec fields used to type `specs[...]` filters: the category's own, or the first definition of each key. */
function fieldsFor(rows: CategoryRow[], category?: CategoryKey): Map<string, SpecField> {
  const fields = new Map<string, SpecField>();
  for (const row of rows) {
    if (category && row.key !== category) continue;
    for (const f of row.specSchema) if (!fields.has(f.key)) fields.set(f.key, f);
  }
  return fields;
}

export function createCatalogService(deps: { db: Db; redis: Redis }) {
  const { db, redis } = deps;

  return {
    async listCategories(): Promise<CategoryDTO[]> {
      return (await listCategoryRows(db)).map(toCategoryDTO);
    },

    /** Null when the category does not exist. */
    async getFacets(keyOrSlug: string): Promise<FacetDTO[] | null> {
      const category = await findCategoryRow(db, keyOrSlug);
      if (!category) return null;
      const fields = category.specSchema.filter((f) => f.filterable);
      const rows = await facetCounts(
        db,
        category.id,
        fields.map((f) => f.key),
      );
      return fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        values: sortFacetValues(
          f,
          rows.filter((r) => r.key === f.key).map(({ value, count }) => ({ value, count })),
        ),
      }));
    },

    async search(q: CatalogQuery): Promise<Paginated<ProductSummaryDTO>> {
      const rows = await listCategoryRows(db);
      const categoryId = q.category ? rows.find((r) => r.key === q.category)?.id : undefined;
      const fields = fieldsFor(rows, q.category);
      const { items, count, page, pageSize } = productSearchQueries(db, q, { categoryId, fields });
      const [found, [totals]] = await Promise.all([items, count]);
      return { items: found.map(toProductSummary), page, pageSize, total: totals?.total ?? 0 };
    },

    /** ACTIVE products only; null for unknown or malformed ids. */
    async getById(id: string): Promise<ProductDTO | null> {
      if (!isUuid(id)) return null;
      const row = await findActiveProduct(db, { id });
      return row ? toProductDTO(row) : null;
    },

    async getBySlugOrId(slugOrId: string): Promise<ProductDTO | null> {
      const row = isUuid(slugOrId)
        ? await findActiveProduct(db, { id: slugOrId })
        : await findActiveProduct(db, { slug: slugOrId });
      return row ? toProductDTO(row) : null;
    },

    /** Buyable products (ACTIVE, available stock > 0) as engine input, cached per catalog version. */
    async getEngineCatalog(): Promise<EngineProduct[]> {
      const key = engineCatalogKey(await getCatalogVersion(redis));
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as EngineProduct[];
      const catalog = (await findBuyableProducts(db)).map(toEngineProduct);
      await redis.set(key, JSON.stringify(catalog), 'EX', ENGINE_CATALOG_TTL_SECONDS);
      return catalog;
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
