import {
  type AdminProductCreateInput,
  type AdminProductDTO,
  type AdminProductPatchInput,
  type CategoryDTO,
  type CategoryKey,
  type Paginated,
  type ProductStatus,
  SPEC_SCHEMAS,
  type SpecField,
} from '@pc/shared';
import { and, asc, count, eq, ilike, or, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { brands, categories, inventoryMovements, products } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { bumpCatalogVersion } from '../../../lib/catalog-version';
import { AppError, notFound } from '../../../lib/errors';
import { baseProductQuery, type ProductWithRefs, toProductDTO } from '../../../lib/products';
import { type FieldIssue, slugify, uniqueViolation, validationError } from '../admin.shared';
import { validateSpecs } from './spec-validator';

export const LOW_STOCK_THRESHOLD = 3;

export function toAdminProductDTO(row: ProductWithRefs): AdminProductDTO {
  const p = row.product;
  return {
    ...toProductDTO(row),
    status: p.status,
    categoryId: p.categoryId,
    stockOnHand: p.stock,
    reserved: p.reserved,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export interface AdminProductFilter {
  category?: CategoryKey;
  q?: string;
  status?: ProductStatus;
  lowStock?: boolean;
  page: number;
  pageSize: number;
}

type CategoryRow = typeof categories.$inferSelect;

export function createAdminProductsService(deps: AppDeps) {
  const { db, redis } = deps;

  async function getRow(id: string): Promise<ProductWithRefs | null> {
    const [row] = await baseProductQuery(db).where(eq(products.id, id));
    return row ?? null;
  }

  async function category(id: string): Promise<CategoryRow | null> {
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row ?? null;
  }

  async function brandId(name: string): Promise<string> {
    await db.insert(brands).values({ name }).onConflictDoNothing({ target: brands.name });
    const [row] = await db.select({ id: brands.id }).from(brands).where(eq(brands.name, name));
    return row!.id;
  }

  function checkSpecs(cat: CategoryRow, specs: Record<string, unknown>) {
    return validateSpecs(specs, cat.specSchema, SPEC_SCHEMAS[cat.key] as z.ZodType);
  }

  function priceIssues(price: number, salePrice: number | null | undefined): FieldIssue[] {
    return salePrice != null && salePrice >= price
      ? [{ path: 'salePrice', message: 'Giá khuyến mãi phải nhỏ hơn giá gốc' }]
      : [];
  }

  function duplicate(err: unknown): never {
    const constraint = uniqueViolation(err);
    if (!constraint) throw err;
    const field = constraint.includes('slug') ? 'slug' : 'sku';
    throw new AppError(409, 'DUPLICATE', field === 'slug' ? 'Slug đã tồn tại' : 'SKU đã tồn tại', { field });
  }

  return {
    async list(f: AdminProductFilter): Promise<Paginated<AdminProductDTO>> {
      const conds: SQL[] = [];
      if (f.category) conds.push(eq(categories.key, f.category));
      if (f.status) conds.push(eq(products.status, f.status));
      if (f.q) {
        const like = `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
        conds.push(or(ilike(products.name, like), ilike(products.sku, like))!);
      }
      if (f.lowStock) conds.push(sql`${products.stock} - ${products.reserved} <= ${LOW_STOCK_THRESHOLD}`);
      const where = conds.length > 0 ? and(...conds) : undefined;
      const [rows, [{ total } = { total: 0 }]] = await Promise.all([
        baseProductQuery(db)
          .where(where)
          .orderBy(asc(categories.sortOrder), asc(products.name))
          .limit(f.pageSize)
          .offset((f.page - 1) * f.pageSize),
        db
          .select({ total: count() })
          .from(products)
          .innerJoin(categories, eq(categories.id, products.categoryId))
          .where(where),
      ]);
      return { items: rows.map(toAdminProductDTO), page: f.page, pageSize: f.pageSize, total };
    },

    async get(id: string): Promise<AdminProductDTO> {
      const row = await getRow(id);
      if (!row) throw notFound('Sản phẩm');
      return toAdminProductDTO(row);
    },

    async create(input: AdminProductCreateInput, actorId: string): Promise<AdminProductDTO> {
      const cat = await category(input.categoryId);
      if (!cat) throw validationError([{ path: 'categoryId', message: 'Danh mục không tồn tại' }]);
      const specs = checkSpecs(cat, input.specs);
      const issues = [...priceIssues(input.price, input.salePrice), ...specs.issues];
      if (issues.length > 0) throw validationError(issues);

      const stock = input.stock ?? 0;
      const values = {
        categoryId: cat.id,
        brandId: await brandId(input.brand),
        sku: input.sku,
        slug: input.slug ?? slugify(input.name),
        name: input.name,
        price: input.price,
        salePrice: input.salePrice ?? null,
        stock,
        images: input.images ?? [],
        specs: specs.value,
        description: input.description ?? null,
        status: input.status ?? 'ACTIVE',
        commercialBoost: input.commercialBoost ?? 0,
      };
      const id = await db
        .transaction(async (tx) => {
          const [created] = await tx.insert(products).values(values).returning({ id: products.id });
          if (stock > 0) {
            await tx.insert(inventoryMovements).values({
              productId: created!.id,
              delta: stock,
              reason: 'IMPORT',
              ref: 'Tồn kho ban đầu',
              actorId,
            });
          }
          return created!.id;
        })
        .catch(duplicate);
      await bumpCatalogVersion(redis);
      return toAdminProductDTO((await getRow(id))!);
    },

    async update(id: string, patch: AdminProductPatchInput): Promise<AdminProductDTO> {
      const current = await getRow(id);
      if (!current) throw notFound('Sản phẩm');
      const p = current.product;
      const categoryChanged = patch.categoryId !== undefined && patch.categoryId !== p.categoryId;
      const issues: FieldIssue[] = [
        ...priceIssues(patch.price ?? p.price, patch.salePrice === undefined ? p.salePrice : patch.salePrice),
      ];
      let specs: Record<string, unknown> | undefined;
      if (patch.specs !== undefined || categoryChanged) {
        const cat = await category(patch.categoryId ?? p.categoryId);
        if (!cat) throw validationError([{ path: 'categoryId', message: 'Danh mục không tồn tại' }]);
        const checked = checkSpecs(cat, patch.specs ?? p.specs);
        issues.push(...checked.issues);
        specs = checked.value;
      }
      if (issues.length > 0) throw validationError(issues);

      await db
        .update(products)
        .set({
          ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
          ...(patch.brand !== undefined ? { brandId: await brandId(patch.brand) } : {}),
          ...(patch.sku !== undefined ? { sku: patch.sku } : {}),
          ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.price !== undefined ? { price: patch.price } : {}),
          ...(patch.salePrice !== undefined ? { salePrice: patch.salePrice } : {}),
          ...(patch.images !== undefined ? { images: patch.images } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.commercialBoost !== undefined ? { commercialBoost: patch.commercialBoost } : {}),
          ...(specs !== undefined ? { specs } : {}),
          updatedAt: deps.now(),
        })
        .where(eq(products.id, id))
        .catch(duplicate);
      await bumpCatalogVersion(redis);
      return toAdminProductDTO((await getRow(id))!);
    },

    /** Products are referenced by orders and builds, so "delete" only hides them from the storefront. */
    async hide(id: string): Promise<AdminProductDTO> {
      const updated = await db
        .update(products)
        .set({ status: 'HIDDEN', updatedAt: deps.now() })
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (updated.length === 0) throw notFound('Sản phẩm');
      await bumpCatalogVersion(redis);
      return toAdminProductDTO((await getRow(id))!);
    },

    async setCategorySchema(id: string, fields: SpecField[]): Promise<CategoryDTO> {
      const [row] = await db
        .update(categories)
        .set({ specSchema: fields })
        .where(eq(categories.id, id))
        .returning();
      if (!row) throw notFound('Danh mục');
      await bumpCatalogVersion(redis);
      return { id: row.id, key: row.key, slug: row.slug, name: row.name, specSchema: row.specSchema };
    },
  };
}
