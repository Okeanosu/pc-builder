import {
  CATEGORY_KEYS,
  type CaseSpecs,
  type CategoryKey,
  type CoolerSpecs,
  type CpuSpecs,
  type GpuSpecs,
  type MainboardSpecs,
  type PsuSpecs,
  type RamSpecs,
  SPEC_SCHEMAS,
  type StorageSpecs,
} from '@pc/shared';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../test/helpers';
import { benchmarks, categories, products, purposeWeights, users } from '../schema';
import { seedDatabase } from './index';
import { SEED_USERS } from './users';

const MIN_COUNTS: Record<CategoryKey, number> = {
  cpu: 30,
  mainboard: 35,
  ram: 25,
  gpu: 30,
  storage: 25,
  psu: 25,
  case: 25,
  cooler: 25,
};

interface Item<S> {
  id: string;
  name: string;
  price: number;
  stock: number;
  specs: S;
  bench: { cpuSingle: number | null; cpuMulti: number | null; gpuScore: number | null } | null;
}

const t = createTestDeps();
const { db } = t.deps;
const byCat = {} as Record<CategoryKey, Item<unknown>[]>;
let totals: { products: number; categories: number };

beforeAll(async () => {
  totals = await seedDatabase(db);
  const rows = await db
    .select({ product: products, key: categories.key, bench: benchmarks })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(benchmarks, eq(benchmarks.productId, products.id));
  for (const key of CATEGORY_KEYS) byCat[key] = [];
  for (const r of rows) {
    byCat[r.key].push({
      id: r.product.id,
      name: r.product.name,
      price: r.product.salePrice ?? r.product.price,
      stock: r.product.stock,
      specs: r.product.specs,
      bench: r.bench,
    });
  }
});

afterAll(() => t.close());

const items = <S>(key: CategoryKey) => byCat[key] as Item<S>[];
const inStock = <S>(key: CategoryKey) => items<S>(key).filter((i) => i.stock > 0);

describe('catalog seed', () => {
  it('meets the per-category counts and total', () => {
    for (const key of CATEGORY_KEYS) expect(byCat[key].length, key).toBeGreaterThanOrEqual(MIN_COUNTS[key]);
    expect(totals.products).toBeGreaterThanOrEqual(220);
    expect(totals.categories).toBe(8);
  });

  it('every product spec passes its category schema', () => {
    for (const key of CATEGORY_KEYS) {
      for (const item of byCat[key]) {
        const parsed = SPEC_SCHEMAS[key].safeParse(item.specs);
        expect(parsed.success, `${key}: ${item.name}`).toBe(true);
      }
    }
  });

  it('category spec_schema lists exactly the spec keys, with labels', async () => {
    const rows = await db.select().from(categories);
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      const schemaKeys = Object.keys((SPEC_SCHEMAS[row.key] as unknown as { shape: object }).shape).sort();
      expect(row.specSchema.map((f) => f.key).sort(), row.key).toEqual(schemaKeys);
      for (const field of row.specSchema) {
        expect(field.label.length).toBeGreaterThan(0);
        if (field.type === 'enum' || field.type === 'enum[]')
          expect(field.options?.length).toBeGreaterThan(0);
      }
      expect(row.slug).toBe(row.key);
    }
  });

  it('has unique sku/slug, rounded prices, bounded stock, ~10% out of stock and empty images', async () => {
    const rows = await db.select().from(products);
    expect(new Set(rows.map((r) => r.sku)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.price % 10_000, r.name).toBe(0);
      if (r.salePrice !== null) {
        expect(r.salePrice % 10_000, r.name).toBe(0);
        expect(r.salePrice).toBeLessThan(r.price);
      }
      expect(r.stock).toBeGreaterThanOrEqual(0);
      expect(r.stock).toBeLessThanOrEqual(30);
      expect(r.images).toEqual([]);
    }
    expect(rows.filter((r) => r.stock === 0).length / rows.length).toBeGreaterThanOrEqual(0.1);
  });

  it('has benchmarks for every cpu and gpu', () => {
    for (const c of byCat.cpu) {
      expect(c.bench?.cpuSingle, c.name).toBeGreaterThan(0);
      expect(c.bench?.cpuMulti, c.name).toBeGreaterThan(0);
    }
    for (const g of byCat.gpu) expect(g.bench?.gpuScore, g.name).toBeGreaterThan(0);
  });

  it('seeds users with working bcrypt hashes and the three roles', async () => {
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(3);
    for (const seed of SEED_USERS) {
      const row = rows.find((r) => r.email === seed.email);
      expect(row?.role).toBe(seed.role);
      expect(await bcrypt.compare(seed.password, row?.passwordHash ?? '')).toBe(true);
    }
  });

  it('seeds purpose weights that sum to 1 with a valid allocation band', async () => {
    const rows = await db.select().from(purposeWeights);
    expect(rows.map((r) => r.purpose).sort()).toEqual(['ai', 'gaming', 'graphics', 'office']);
    for (const row of rows) {
      const sum = Object.values(row.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 3);
      for (const key of CATEGORY_KEYS) {
        const band = row.allocation[key];
        expect(band.min).toBeGreaterThanOrEqual(0);
        expect(band.max).toBeLessThanOrEqual(1);
        expect(band.min).toBeLessThanOrEqual(row.weights[key]);
        expect(band.max).toBeGreaterThanOrEqual(row.weights[key]);
      }
    }
    expect(rows.find((r) => r.purpose === 'office')?.allocation.gpu.max).toBe(0);
  });

  it('is idempotent and honours the users/weights options', async () => {
    const again = await seedDatabase(db, { users: false, weights: false });
    expect(again.products).toBe(totals.products);
    expect(await db.select().from(users)).toHaveLength(0);
    expect(await db.select().from(purposeWeights)).toHaveLength(0);
    expect(await db.select().from(products)).toHaveLength(totals.products);
    await seedDatabase(db);
  });
});

describe('catalog coverage', () => {
  const sockets = ['AM4', 'AM5', 'LGA1700', 'LGA1851'] as const;

  it('every socket has in-stock cpu, mainboard and cooler', () => {
    for (const s of sockets) {
      expect(inStock<CpuSpecs>('cpu').filter((c) => c.specs.socket === s).length, `cpu ${s}`).toBeGreaterThan(
        0,
      );
      expect(
        inStock<MainboardSpecs>('mainboard').filter((c) => c.specs.socket === s).length,
        `board ${s}`,
      ).toBeGreaterThan(0);
      expect(
        inStock<CoolerSpecs>('cooler').filter((c) => c.specs.sockets.includes(s)).length,
        `cooler ${s}`,
      ).toBeGreaterThan(0);
    }
  });

  it('every memory type has an in-stock RAM kit and every socket family an iGPU cpu', () => {
    for (const type of ['DDR4', 'DDR5'] as const) {
      expect(inStock<RamSpecs>('ram').filter((r) => r.specs.type === type).length, type).toBeGreaterThan(0);
    }
    for (const s of sockets) {
      const igpu = inStock<CpuSpecs>('cpu').filter((c) => c.specs.socket === s && c.specs.integratedGraphics);
      expect(igpu.length, `iGPU ${s}`).toBeGreaterThan(0);
    }
  });

  it('has cases for every form factor, an SFF case for compact GPUs and an SFX psu', () => {
    for (const ff of ['ATX', 'mATX', 'ITX'] as const) {
      const cases = inStock<CaseSpecs>('case').filter((c) => c.specs.supportedFormFactors.includes(ff));
      expect(cases.length, ff).toBeGreaterThan(0);
    }
    const itx = inStock<CaseSpecs>('case').filter(
      (c) => c.specs.supportedFormFactors.length === 1 && c.specs.supportedFormFactors[0] === 'ITX',
    );
    expect(itx.some((c) => c.specs.maxGpuLengthMm <= 250)).toBe(true);
    expect(inStock<PsuSpecs>('psu').some((p) => p.specs.formFactor === 'SFX')).toBe(true);
    expect(inStock<MainboardSpecs>('mainboard').some((m) => m.specs.formFactor === 'ITX')).toBe(true);
  });

  describe.each([15, 25, 40, 60])('greedy compatible build within %i triệu', (millions) => {
    it('exists', () => {
      const budget = millions * 1_000_000;
      const cheapest = <T extends { price: number }>(list: T[]) =>
        list.reduce<T | undefined>((best, x) => (!best || x.price < best.price ? x : best), undefined);
      const ssds = inStock<StorageSpecs>('storage').filter(
        (s) => s.specs.interface === 'NVMe' && s.specs.capacityGB >= 500,
      );
      const ssd = cheapest(ssds);
      let found: string | undefined;

      for (const cpu of inStock<CpuSpecs>('cpu')) {
        for (const mb of inStock<MainboardSpecs>('mainboard')) {
          if (mb.specs.socket !== cpu.specs.socket || !cpu.specs.memoryTypes.includes(mb.specs.memoryType))
            continue;
          const ram = cheapest(
            inStock<RamSpecs>('ram').filter(
              (r) =>
                r.specs.type === mb.specs.memoryType &&
                r.specs.capacityGB >= 16 &&
                r.specs.modules <= mb.specs.memorySlots,
            ),
          );
          if (!ram || !ssd) continue;
          for (const gpu of inStock<GpuSpecs>('gpu')) {
            const need = Math.ceil((cpu.specs.tdpW + gpu.specs.tgpW + 75) * 1.3);
            for (const cs of inStock<CaseSpecs>('case')) {
              if (!cs.specs.supportedFormFactors.includes(mb.specs.formFactor)) continue;
              if (gpu.specs.lengthMm > cs.specs.maxGpuLengthMm) continue;
              const psu = cheapest(
                inStock<PsuSpecs>('psu').filter(
                  (p) => p.specs.wattage >= need && cs.specs.psuFormFactors.includes(p.specs.formFactor),
                ),
              );
              const cooler = cheapest(
                inStock<CoolerSpecs>('cooler').filter(
                  (c) =>
                    c.specs.sockets.includes(cpu.specs.socket) &&
                    c.specs.tdpRatingW >= cpu.specs.tdpW &&
                    (c.specs.type === 'air'
                      ? (c.specs.heightMm ?? 0) <= cs.specs.maxCoolerHeightMm
                      : cs.specs.radiatorSupportMm.includes(c.specs.radiatorMm ?? -1)),
                ),
              );
              if (!psu || !cooler) continue;
              const total =
                cpu.price +
                mb.price +
                ram.price +
                gpu.price +
                cs.price +
                psu.price +
                cooler.price +
                ssd.price;
              if (total <= budget) found = `${cpu.name} + ${gpu.name} = ${total}`;
            }
          }
        }
      }
      expect(found, `no build within ${millions}tr`).toBeDefined();
    });
  });
});
