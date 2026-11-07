import { pathToFileURL } from 'node:url';
import { CATEGORY_KEYS } from '@pc/shared';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from '../client';
import {
  benchmarks,
  brands,
  categories,
  inventoryMovements,
  products,
  purposeWeights,
  users,
} from '../schema';
import { BRAND_NAMES } from './data/brands';
import { CATALOG } from './data/catalog';
import { CATEGORY_ROWS } from './data/categories';
import { slugify } from './data/helpers';
import { buildUserRows } from './users';
import { WEIGHT_ROWS } from './weights';

export interface SeedOptions {
  users?: boolean;
  weights?: boolean;
}

export async function seedDatabase(
  db: Db,
  opts: SeedOptions = {},
): Promise<{ products: number; categories: number }> {
  const withUsers = opts.users ?? true;
  const withWeights = opts.weights ?? true;

  await db.execute(sql`TRUNCATE chat_messages, chat_sessions, payments, order_items, orders, cart_items, carts, builds,
    inventory_movements, benchmarks, products, brands, categories, purpose_weights, users RESTART IDENTITY CASCADE`);

  const categoryRows = await db.insert(categories).values(CATEGORY_ROWS).returning();
  const categoryId = new Map(categoryRows.map((c) => [c.key, c.id]));

  const brandRows = await db
    .insert(brands)
    .values(BRAND_NAMES.map((name) => ({ name })))
    .returning();
  const brandId = new Map(brandRows.map((b) => [b.name, b.id]));

  const productValues = CATEGORY_KEYS.flatMap((key) =>
    CATALOG[key].map((p) => ({
      categoryId: categoryId.get(key) as string,
      brandId: brandId.get(p.brand) as string,
      sku: p.sku,
      slug: slugify(p.name),
      name: p.name,
      price: p.price,
      salePrice: p.salePrice ?? null,
      stock: p.stock,
      images: [] as string[],
      specs: p.specs as unknown as Record<string, unknown>,
      description: p.description,
      commercialBoost: p.commercialBoost ?? 0,
    })),
  );
  const inserted = await db
    .insert(products)
    .values(productValues)
    .returning({ id: products.id, sku: products.sku });
  const productId = new Map(inserted.map((p) => [p.sku, p.id]));

  const benchmarkValues = CATEGORY_KEYS.flatMap((key) =>
    CATALOG[key].flatMap((p) =>
      p.benchmark
        ? [
            {
              productId: productId.get(p.sku) as string,
              cpuSingle: p.benchmark.cpuSingle ?? null,
              cpuMulti: p.benchmark.cpuMulti ?? null,
              gpuScore: p.benchmark.gpuScore ?? null,
              source: key === 'cpu' ? 'Cinebench R23' : '3DMark Time Spy',
            },
          ]
        : [],
    ),
  );
  await db.insert(benchmarks).values(benchmarkValues);

  const movements = CATEGORY_KEYS.flatMap((key) =>
    CATALOG[key]
      .filter((p) => p.stock > 0)
      .map((p) => ({
        productId: productId.get(p.sku) as string,
        delta: p.stock,
        reason: 'IMPORT' as const,
        ref: 'seed',
      })),
  );
  await db.insert(inventoryMovements).values(movements);

  if (withUsers) await db.insert(users).values(await buildUserRows());
  if (withWeights) await db.insert(purposeWeights).values(WEIGHT_ROWS);

  return { products: inserted.length, categories: categoryRows.length };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, sql: client } = createDb(url);
  try {
    const result = await seedDatabase(db);
    const perCategory = await db.execute(sql`SELECT c.key, count(*)::int AS count FROM products p
      JOIN categories c ON c.id = p.category_id GROUP BY c.key ORDER BY c.key`);
    console.log(`Seeded ${result.categories} categories, ${result.products} products`);
    for (const row of perCategory) console.log(`  ${row.key}: ${row.count}`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
