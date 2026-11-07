import type {
  AdminProductDTO,
  BenchmarkDTO,
  benchmarkInputSchema,
  CategoryKey,
  InventoryAdjustInput,
  InventoryMovementDTO,
  Paginated,
} from '@pc/shared';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { benchmarks, categories, inventoryMovements, products, users } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { bumpCatalogVersion } from '../../../lib/catalog-version';
import { AppError, notFound } from '../../../lib/errors';
import { baseProductQuery } from '../../../lib/products';
import { toAdminProductDTO } from '../products/products.service';

const movementColumns = {
  m: inventoryMovements,
  actorEmail: users.email,
  actorName: users.fullName,
};

function toMovementDTO(r: {
  m: typeof inventoryMovements.$inferSelect;
  actorEmail: string | null;
  actorName: string | null;
}): InventoryMovementDTO {
  return {
    id: r.m.id,
    productId: r.m.productId,
    delta: r.m.delta,
    reason: r.m.reason,
    ref: r.m.ref,
    actor:
      r.m.actorId && r.actorEmail
        ? { id: r.m.actorId, email: r.actorEmail, fullName: r.actorName ?? '' }
        : null,
    createdAt: r.m.createdAt.toISOString(),
  };
}

export function createAdminInventoryService(deps: AppDeps) {
  const { db, redis } = deps;

  async function productExists(id: string) {
    const [row] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!row) throw notFound('Sản phẩm');
  }

  async function benchmarkOf(productId: string): Promise<BenchmarkDTO> {
    const [row] = await db
      .select({ product: products, category: categories.key, b: benchmarks })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(benchmarks, eq(benchmarks.productId, products.id))
      .where(eq(products.id, productId));
    if (!row) throw notFound('Sản phẩm');
    return {
      productId: row.product.id,
      productName: row.product.name,
      category: row.category,
      cpuSingle: row.b?.cpuSingle ?? null,
      cpuMulti: row.b?.cpuMulti ?? null,
      gpuScore: row.b?.gpuScore ?? null,
      source: row.b?.source ?? null,
      updatedAt: row.b?.updatedAt.toISOString() ?? null,
    };
  }

  return {
    /** Stock changes atomically and is refused if it would drop below units held for unpaid orders. */
    async adjust(
      productId: string,
      input: InventoryAdjustInput,
      actorId: string,
    ): Promise<{ product: AdminProductDTO; movement: InventoryMovementDTO }> {
      const { delta } = input;
      const movementId = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${delta}`, updatedAt: deps.now() })
          .where(
            and(
              eq(products.id, productId),
              sql`${products.stock} + ${delta} >= ${products.reserved}`,
              sql`${products.stock} + ${delta} >= 0`,
            ),
          )
          .returning({ id: products.id });
        if (!updated) {
          const [cur] = await tx
            .select({ stock: products.stock, reserved: products.reserved })
            .from(products)
            .where(eq(products.id, productId));
          if (!cur) throw notFound('Sản phẩm');
          throw new AppError(
            409,
            'STOCK_BELOW_RESERVED',
            `Tồn kho không được thấp hơn số đang giữ cho đơn chờ thanh toán (${cur.reserved})`,
            { stock: cur.stock, reserved: cur.reserved, delta },
          );
        }
        const [mv] = await tx
          .insert(inventoryMovements)
          .values({ productId, delta, reason: input.reason, ref: input.note ?? null, actorId })
          .returning({ id: inventoryMovements.id });
        return mv!.id;
      });
      await bumpCatalogVersion(redis);
      const [row] = await baseProductQuery(db).where(eq(products.id, productId));
      const [mv] = await db
        .select(movementColumns)
        .from(inventoryMovements)
        .leftJoin(users, eq(users.id, inventoryMovements.actorId))
        .where(eq(inventoryMovements.id, movementId));
      return { product: toAdminProductDTO(row!), movement: toMovementDTO(mv!) };
    },

    async movements(
      productId: string,
      page: number,
      pageSize: number,
    ): Promise<Paginated<InventoryMovementDTO>> {
      await productExists(productId);
      const where = eq(inventoryMovements.productId, productId);
      const [rows, [{ total } = { total: 0 }]] = await Promise.all([
        db
          .select(movementColumns)
          .from(inventoryMovements)
          .leftJoin(users, eq(users.id, inventoryMovements.actorId))
          .where(where)
          .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ total: count() }).from(inventoryMovements).where(where),
      ]);
      return { items: rows.map(toMovementDTO), page, pageSize, total };
    },

    benchmarkOf,

    async listBenchmarks(category?: CategoryKey): Promise<BenchmarkDTO[]> {
      const rows = await db
        .select({ product: products, category: categories.key, b: benchmarks })
        .from(products)
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(benchmarks, eq(benchmarks.productId, products.id))
        .where(category ? eq(categories.key, category) : sql`${categories.key} in ('cpu', 'gpu')`)
        .orderBy(asc(categories.sortOrder), asc(products.name));
      return rows.map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        category: row.category,
        cpuSingle: row.b?.cpuSingle ?? null,
        cpuMulti: row.b?.cpuMulti ?? null,
        gpuScore: row.b?.gpuScore ?? null,
        source: row.b?.source ?? null,
        updatedAt: row.b?.updatedAt.toISOString() ?? null,
      }));
    },

    /** Upsert; omitted fields keep their value, explicit null clears it. Scores feed the engine's scoring. */
    async putBenchmark(
      productId: string,
      input: z.infer<typeof benchmarkInputSchema>,
    ): Promise<BenchmarkDTO> {
      await productExists(productId);
      const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
      const now = deps.now();
      await db
        .insert(benchmarks)
        .values({ productId, ...set, updatedAt: now })
        .onConflictDoUpdate({ target: benchmarks.productId, set: { ...set, updatedAt: now } });
      await bumpCatalogVersion(redis);
      return benchmarkOf(productId);
    },
  };
}
