import type { SpecField } from '@pc/shared';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, type SQL, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { benchmarks, brands, categories, products } from '../../db/schema';
import { baseProductQuery, type ProductWithRefs } from '../../lib/products';
import { type CatalogQuery, rangeFilters, specContainment } from './catalog.filters';

export type CategoryRow = typeof categories.$inferSelect;

const effectivePriceSql = sql<number>`coalesce(${products.salePrice}, ${products.price})`;
const buyableSql = sql`${products.stock} - ${products.reserved} > 0`;
const containsSql = (json: Record<string, unknown>) =>
  sql`${products.specs} @> ${JSON.stringify(json)}::jsonb`;
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function listCategoryRows(db: Db): Promise<CategoryRow[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.key));
}

export async function findCategoryRow(db: Db, keyOrSlug: string): Promise<CategoryRow | undefined> {
  const [row] = await db
    .select()
    .from(categories)
    .where(or(sql`${categories.key} = ${keyOrSlug}`, eq(categories.slug, keyOrSlug)))
    .limit(1);
  return row;
}

function orderFor(q: CatalogQuery): SQL[] {
  const tie = asc(products.id);
  switch (q.sort ?? 'newest') {
    case 'price_asc':
      return [asc(effectivePriceSql), tie];
    case 'price_desc':
      return [desc(effectivePriceSql), tie];
    case 'name':
      return [asc(products.name), tie];
    case 'performance':
      if (q.category === 'cpu') return [sql`${benchmarks.cpuMulti} desc nulls last`, tie];
      if (q.category === 'gpu') return [sql`${benchmarks.gpuScore} desc nulls last`, tie];
      return [desc(effectivePriceSql), tie];
    default:
      return [desc(products.createdAt), tie];
  }
}

export interface SearchContext {
  /** Resolved id of `q.category`; filtering on the column (not the join) gives the planner real statistics. */
  categoryId?: string;
  fields?: ReadonlyMap<string, SpecField>;
}

function searchConditions(q: CatalogQuery, ctx: SearchContext): SQL[] {
  const fields = ctx.fields ?? new Map<string, SpecField>();
  const conds: SQL[] = [eq(products.status, 'ACTIVE')];
  if (ctx.categoryId) conds.push(eq(products.categoryId, ctx.categoryId));
  else if (q.category) conds.push(eq(categories.key, q.category));
  const brandNames = (q.brand ?? '')
    .split(',')
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean);
  if (brandNames.length > 0) conds.push(inArray(sql`lower(${brands.name})`, brandNames));
  if (q.minPrice !== undefined) conds.push(gte(effectivePriceSql, q.minPrice));
  if (q.maxPrice !== undefined) conds.push(lte(effectivePriceSql, q.maxPrice));
  if (q.inStock) conds.push(buyableSql);
  if (q.q) {
    const pattern = `%${escapeLike(q.q)}%`;
    conds.push(
      or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        sql`to_tsvector('simple', ${products.name}) @@ plainto_tsquery('simple', ${q.q})`,
      ) as SQL,
    );
  }
  if (q.specs) {
    const { all, anyOf } = specContainment(q.specs, fields);
    if (all) conds.push(containsSql(all));
    for (const group of anyOf) conds.push(or(...group.map(containsSql)) as SQL);
  }
  for (const r of rangeFilters(q.specsMin, q.specsMax, fields)) {
    const value = sql`(case when jsonb_typeof(${products.specs} -> ${r.key}::text) = 'number'
      then (${products.specs} ->> ${r.key}::text)::numeric end)`;
    conds.push(r.op === 'gte' ? sql`${value} >= ${r.value}` : sql`${value} <= ${r.value}`);
  }
  return conds;
}

/** The page query and the matching count query; exposed so tests can EXPLAIN the real SQL. */
export function productSearchQueries(db: Db, q: CatalogQuery, ctx: SearchContext = {}) {
  const where = and(...searchConditions(q, ctx));
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 24;
  const items = baseProductQuery(db)
    .where(where)
    .orderBy(...orderFor(q))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const count = db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);
  return { items, count, page, pageSize };
}

export async function findActiveProduct(
  db: Db,
  by: { id: string } | { slug: string },
): Promise<ProductWithRefs | undefined> {
  const match = 'id' in by ? eq(products.id, by.id) : eq(products.slug, by.slug);
  const [row] = await baseProductQuery(db)
    .where(and(match, eq(products.status, 'ACTIVE')))
    .limit(1);
  return row;
}

export function findBuyableProducts(db: Db): Promise<ProductWithRefs[]> {
  return baseProductQuery(db)
    .where(and(eq(products.status, 'ACTIVE'), buyableSql))
    .orderBy(asc(products.id));
}

export type FacetCountRow = {
  key: string;
  value: string;
  count: number;
};

/** Per-field value counts over ACTIVE products of a category; array specs count each element once per product. */
export async function facetCounts(db: Db, categoryId: string, keys: string[]): Promise<FacetCountRow[]> {
  if (keys.length === 0) return [];
  const rows = await db.execute<FacetCountRow>(sql`
    SELECT e.key, coalesce(a.elem, e.value #>> '{}') AS value, count(DISTINCT p.id)::int AS count
    FROM products p
    CROSS JOIN LATERAL jsonb_each(p.specs) AS e
    LEFT JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(e.value) = 'array' THEN e.value END
    ) AS a(elem) ON true
    WHERE p.category_id = ${categoryId}
      AND p.status = 'ACTIVE'
      AND e.key IN (${sql.join(
        keys.map((k) => sql`${k}`),
        sql`, `,
      )})
      AND jsonb_typeof(e.value) <> 'null'
      AND NOT (jsonb_typeof(e.value) = 'array' AND a.elem IS NULL)
    GROUP BY 1, 2`);
  return [...rows];
}
