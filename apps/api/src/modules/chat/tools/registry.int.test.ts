import type { EngineProduct } from '@pc/engine';
import type { BuildDTO, ChatEvent, CpuSpecs, MainboardSpecs, ProductSummaryDTO } from '@pc/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDeps } from '../../../../test/helpers';
import { builds, users } from '../../../db/schema';
import { seedDatabase } from '../../../db/seed';
import { createCatalogService } from '../../catalog';
import { buildRequestKey } from './recommendation-runner';
import { createToolRegistry } from './registry';
import type { RecommendForModel } from './shared';
import type { ToolRegistry, ToolResult } from './types';

const t = createTestDeps();
const { db, redis } = t.deps;
let registry: ToolRegistry;
let catalog: EngineProduct[];
let userId: string;

const ctx = () => ({ sessionId: 's-int', userId });

async function run(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`tool ${name} not registered`);
  return tool.run(args, ctx());
}

const productsEvent = (r: ToolResult) =>
  (r.events ?? []).find((e): e is Extract<ChatEvent, { type: 'products' }> => e.type === 'products');
const buildsEvent = (r: ToolResult) =>
  (r.events ?? []).find((e): e is Extract<ChatEvent, { type: 'builds' }> => e.type === 'builds');

beforeAll(async () => {
  await seedDatabase(db);
  await redis.flushdb();
  registry = createToolRegistry(t.deps);
  catalog = await createCatalogService({ db, redis }).getEngineCatalog();
  const [u] = await db.select().from(users).where(eq(users.email, 'khach@pcbuilder.vn'));
  userId = u!.id;
});
afterAll(() => t.close());

describe('createToolRegistry', () => {
  it('registers the five declared tools with Vietnamese labels', () => {
    expect([...registry.keys()].sort()).toEqual([
      'check_compatibility',
      'get_product_details',
      'modify_build',
      'recommend_builds',
      'search_products',
    ]);
    for (const [name, tool] of registry) {
      expect(tool.decl.name).toBe(name);
      expect(tool.label).toMatch(/^Đang /);
    }
  });
});

describe('search_products', () => {
  it('returns at most 8 in-stock products in range as a products event and a compact list for the model', async () => {
    const r = await run('search_products', { category: 'gpu', maxPrice: 15_000_000 });
    const products = productsEvent(r)!.products;
    expect(products.length).toBeGreaterThan(0);
    expect(products.length).toBeLessThanOrEqual(8);
    for (const p of products) {
      expect(p.category).toBe('gpu');
      expect(p.stock).toBeGreaterThan(0);
      expect(p.salePrice ?? p.price).toBeLessThanOrEqual(15_000_000);
    }
    const listed = r.forModel.products as Array<Record<string, unknown>>;
    expect(listed.map((p) => p.id)).toEqual(products.map((p) => p.id));
    expect(Object.keys(listed[0]!).sort()).toEqual(
      expect.arrayContaining(['id', 'name', 'brand', 'price', 'keySpecs']),
    );
    expect(JSON.stringify(r.forModel)).not.toContain('"specs"');
  });

  it('applies spec filters given as {key, value} pairs', async () => {
    const r = await run('search_products', { category: 'cpu', filters: [{ key: 'socket', value: 'AM5' }] });
    const products = productsEvent(r)!.products;
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p: ProductSummaryDTO) => p.keySpecs.socket === 'AM5')).toBe(true);
  });

  it('matches a keyword', async () => {
    const name = catalog.find((p) => p.category === 'gpu')!.name;
    const keyword = name.split(' ').slice(-2).join(' ');
    const r = await run('search_products', { category: 'gpu', keyword });
    expect(productsEvent(r)!.products.some((p) => p.name === name)).toBe(true);
  });

  it('answers a bad filter with an error the model can act on', async () => {
    const r = await run('search_products', { category: 'cpu', filters: [{ key: 'cores', value: 'nhiều' }] });
    expect(r.forModel).toMatchObject({ error: 'INVALID_FILTER' });
    expect(r.events ?? []).toEqual([]);
  });

  it('says so when nothing matches', async () => {
    const r = await run('search_products', { category: 'gpu', maxPrice: 1000 });
    expect(r.forModel).toMatchObject({ total: 0, products: [] });
    expect(String(r.forModel.message)).toMatch(/Không có/);
    expect(productsEvent(r)).toBeUndefined();
  });
});

describe('get_product_details', () => {
  it('returns the main specs and the benchmark', async () => {
    const cpu = catalog.find((p) => p.category === 'cpu' && p.benchmark?.cpuMulti)!;
    const r = await run('get_product_details', { productId: cpu.id });
    expect(r.forModel).toMatchObject({
      id: cpu.id,
      name: cpu.name,
      category: 'cpu',
      price: cpu.price,
      inStock: true,
      specs: { socket: (cpu.specs as CpuSpecs).socket, cores: (cpu.specs as CpuSpecs).cores },
      benchmark: { cpuMulti: cpu.benchmark!.cpuMulti },
    });
  });

  it('answers NOT_FOUND for unknown or malformed ids', async () => {
    expect((await run('get_product_details', { productId: 'abc' })).forModel).toMatchObject({
      error: 'NOT_FOUND',
    });
    expect(
      (await run('get_product_details', { productId: '00000000-0000-4000-8000-000000000000' })).forModel,
    ).toMatchObject({ error: 'NOT_FOUND' });
  });
});

describe('check_compatibility', () => {
  it('lists issues with Vietnamese messages and the estimated wattage', async () => {
    const cpu = catalog.find((p) => p.category === 'cpu')!;
    const board = catalog.find(
      (p) =>
        p.category === 'mainboard' && (p.specs as MainboardSpecs).socket !== (cpu.specs as CpuSpecs).socket,
    )!;
    const r = await run('check_compatibility', { productIds: [cpu.id, board.id] });
    const issues = r.forModel.issues as Array<{ code: string; severity: string; message: string }>;
    expect(r.forModel.ok).toBe(false);
    expect(issues.find((i) => i.code === 'C01')).toMatchObject({ severity: 'error' });
    expect(issues.find((i) => i.code === 'C01')!.message).toMatch(/[ăâđêôơư]/i);
    expect(r.forModel.estimatedWattage).toBeGreaterThan(0);
    expect(r.forModel.missingCategories).toEqual(expect.arrayContaining(['RAM', 'Nguồn']));
    expect((r.forModel.parts as unknown[]).length).toBe(2);
  });

  it('answers unknown ids and doubled categories without throwing', async () => {
    const [a, b] = catalog.filter((p) => p.category === 'cpu');
    expect((await run('check_compatibility', { productIds: ['nope'] })).forModel).toMatchObject({
      error: 'NOT_FOUND',
      missing: ['nope'],
    });
    expect((await run('check_compatibility', { productIds: [a!.id, b!.id] })).forModel).toMatchObject({
      error: 'DUPLICATE_CATEGORY',
    });
    expect((await run('check_compatibility', { productIds: [] })).forModel).toMatchObject({
      error: 'INVALID_ARGUMENTS',
    });
  });
});

describe('recommend_builds and modify_build over the real engine', () => {
  let first: BuildDTO;

  it('recommend_builds persists CHAT builds for the user and remembers the request', async () => {
    const r = await run('recommend_builds', {
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'AMD' },
    });
    const out = r.forModel as unknown as RecommendForModel;
    expect(out.builds.length).toBeGreaterThan(0);
    expect(r.buildIds).toEqual(out.builds.map((b) => b.id));
    first = buildsEvent(r)!.builds[0]!;
    const rows = await db.select().from(builds).where(inArray(builds.id, r.buildIds!));
    expect(rows.every((row) => row.source === 'CHAT' && row.userId === userId)).toBe(true);
    expect(JSON.parse((await redis.get(buildRequestKey(first.id)))!)).toEqual({
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'AMD' },
    });
    for (const b of out.builds) expect(b.totalPrice).toBeLessThanOrEqual(25_000_000);
  });

  it('modify_build swaps the GPU and keeps the remaining parts (or reports which ones it had to change)', async () => {
    const r = await run('modify_build', { buildId: first.id, replaceCategory: 'gpu' });
    const out = r.forModel as unknown as RecommendForModel;
    expect(out.builds.length).toBeGreaterThan(0);
    const next = buildsEvent(r)!.builds[0]!;
    const oldGpu = first.items.find((i) => i.category === 'gpu')!.product.id;
    expect(next.items.find((i) => i.category === 'gpu')!.product.id).not.toBe(oldGpu);
    const changed = new Set(out.changedCategories);
    for (const item of first.items) {
      if (item.category === 'gpu') continue;
      const label = { psu: 'Nguồn', case: 'Vỏ case' }[item.category as 'psu' | 'case'];
      if (label && changed.has(label)) continue;
      expect(next.items.find((i) => i.category === item.category)!.product.id).toBe(item.product.id);
    }
    const cpu = next.items.find((i) => i.category === 'cpu')!.product;
    expect(cpu.brand).toBe('AMD');
  });

  it('modify_build with only a budget change re-solves within the new budget', async () => {
    const r = await run('modify_build', { buildId: first.id, budgetDelta: -5_000_000 });
    const out = r.forModel as unknown as RecommendForModel;
    expect(out.budget).toBe(20_000_000);
    expect(out.builds.length).toBeGreaterThan(0);
    for (const b of out.builds) expect(b.totalPrice).toBeLessThanOrEqual(20_000_000);
  });
});
