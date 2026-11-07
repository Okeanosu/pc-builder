import {
  type BuildDTO,
  CATEGORY_KEYS,
  type CategoryKey,
  MAX_BUDGET,
  MIN_BUDGET,
  type RecommendationRequest,
} from '@pc/shared';
import { describe, expect, it } from 'vitest';
import type { RecommendMeta } from '../../recommendation';
import { createModifyBuildTool, planModification } from './modify-build';
import { createRecommendBuildsTool } from './recommend-builds';
import { memoryBuildRequestStore, type RecommendOutcome } from './recommendation-runner';
import type { RecommendForModel } from './shared';

const ctx = { sessionId: 's1', userId: 'u1' };

function product(category: CategoryKey, id = `${category}-1`, price = 1_000_000) {
  return {
    id,
    slug: id,
    sku: id.toUpperCase(),
    name: `${category.toUpperCase()} ${id}`,
    brand: 'Brand',
    category,
    price,
    salePrice: null,
    stock: 5,
    image: null,
    keySpecs: { secret: 'spec' },
  };
}

function build(
  id: string,
  opts: { categories?: CategoryKey[]; budget?: number; purpose?: BuildDTO['purpose'] } = {},
): BuildDTO {
  const categories = opts.categories ?? [...CATEGORY_KEYS];
  return {
    id,
    name: `Build ${id}`,
    label: 'balanced',
    purpose: opts.purpose ?? 'gaming',
    budget: opts.budget ?? 25_000_000,
    source: 'CHAT',
    items: categories.map((c) => ({ category: c, product: product(c, `${c}-${id}`) })),
    totalPrice: 24_000_000,
    score: 80,
    scoreBreakdown: { cpu: 70 },
    allocation: { cpu: 0.2, gpu: 0.4, ram: undefined },
    estimatedWattage: 420,
    recommendedPsuWattage: 650,
    warnings: [{ code: 'C13', severity: 'warning', message: 'CPU hơi yếu so với card', categories: ['cpu'] }],
    createdAt: new Date(0).toISOString(),
  };
}

interface FakeRecommend {
  (req: RecommendationRequest, meta: RecommendMeta): Promise<RecommendOutcome>;
  calls: Array<{ req: RecommendationRequest; meta: RecommendMeta }>;
}

function fakeRecommend(
  ...outcomes: Array<RecommendOutcome | ((req: RecommendationRequest) => RecommendOutcome)>
) {
  const calls: FakeRecommend['calls'] = [];
  const fn = (async (req, meta) => {
    calls.push({ req, meta });
    const next = outcomes[Math.min(calls.length - 1, outcomes.length - 1)];
    if (!next) throw new Error('no outcome scripted');
    return typeof next === 'function' ? next(req) : next;
  }) as FakeRecommend;
  fn.calls = calls;
  return fn;
}

const ok = (...ids: string[]): RecommendOutcome => ({ builds: ids.map((id) => build(id)) });
const forModel = (r: { forModel: Record<string, unknown> }) => r.forModel as unknown as RecommendForModel;

describe('recommend_builds tool', () => {
  function setup(outcome: RecommendOutcome = ok('b1', 'b2')) {
    const recommend = fakeRecommend(outcome);
    const requests = memoryBuildRequestStore();
    const products = new Map([['gpu-x', { ...product('gpu', 'gpu-x'), stock: 3 }]]);
    const tool = createRecommendBuildsTool({
      recommend,
      requests,
      getProduct: async (id) => products.get(id) ?? null,
    });
    return { recommend, requests, tool };
  }

  it('calls the engine as CHAT for the user and returns compact summaries, a builds event and the ids', async () => {
    const { tool, recommend } = setup();
    const result = await tool.run(
      {
        budget: 25_000_000,
        purpose: 'gaming',
        resolution: '1440p',
        preferences: { cpuBrand: 'AMD', rgb: true, color: 'pink', minRamGB: 31.6 },
      },
      ctx,
    );
    expect(recommend.calls).toHaveLength(1);
    expect(recommend.calls[0]).toEqual({
      req: {
        budget: 25_000_000,
        purpose: 'gaming',
        preferences: { cpuBrand: 'AMD', minRamGB: 32, resolution: '1440p' },
      },
      meta: { source: 'CHAT', userId: 'u1' },
    });
    expect(result.buildIds).toEqual(['b1', 'b2']);
    expect(result.events).toEqual([{ type: 'builds', builds: [build('b1'), build('b2')] }]);
    const out = forModel(result);
    expect(out.budget).toBe(25_000_000);
    expect(out.builds[0]).toEqual({
      id: 'b1',
      label: 'balanced',
      totalPrice: 24_000_000,
      score: 80,
      parts: CATEGORY_KEYS.map((c) => ({
        category: c,
        productId: `${c}-b1`,
        name: `${c.toUpperCase()} ${c}-b1`,
        price: 1_000_000,
      })),
      allocation: { cpu: 0.2, gpu: 0.4 },
      warnings: ['CPU hơi yếu so với card'],
    });
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(out.note).toBeUndefined();
  });

  it('remembers the request of every returned build for later modifications', async () => {
    const { tool, requests } = setup();
    await tool.run({ budget: 25_000_000, purpose: 'gaming', preferences: { color: 'white' } }, ctx);
    expect(requests.entries.get('b2')).toEqual({
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { color: 'white' },
    });
  });

  it.each([
    [3_000_000, MIN_BUDGET],
    [500_000_000, MAX_BUDGET],
  ])('clamps a budget of %i into range (%i) and tells the model', async (asked, used) => {
    const { tool, recommend } = setup();
    const out = forModel(await tool.run({ budget: asked, purpose: 'office' }, ctx));
    expect(recommend.calls[0]!.req.budget).toBe(used);
    expect(out.budget).toBe(used);
    expect(out.note).toMatch(/đã dùng/);
  });

  it('accepts a quoted number budget', async () => {
    const { tool, recommend } = setup();
    await tool.run({ budget: '25000000', purpose: 'ai' }, ctx);
    expect(recommend.calls[0]!.req).toMatchObject({ budget: 25_000_000, purpose: 'ai' });
  });

  it.each([
    [{ purpose: 'gaming' }, 'budget'],
    [{ budget: 25_000_000 }, 'purpose'],
    [{ budget: 25_000_000, purpose: 'mining' }, 'purpose'],
  ])('rejects %j without calling the engine', async (args, missing) => {
    const { tool, recommend } = setup();
    const result = await tool.run(args, ctx);
    expect(recommend.calls).toHaveLength(0);
    expect(result.forModel).toMatchObject({ error: 'INVALID_ARGUMENTS' });
    expect(String(result.forModel.message)).toContain(missing === 'budget' ? 'ngân sách' : 'mục đích');
    expect(result.buildIds ?? []).toEqual([]);
  });

  it('explains an infeasible budget in Vietnamese with the minimum and emits no builds event', async () => {
    const { tool } = setup({ builds: [], infeasibleReason: 'BUDGET_TOO_LOW', minFeasibleBudget: 10_020_000 });
    const result = await tool.run({ budget: 8_000_000, purpose: 'gaming' }, ctx);
    expect(result.events).toEqual([]);
    expect(result.buildIds).toEqual([]);
    expect(forModel(result)).toMatchObject({
      builds: [],
      minFeasibleBudget: 10_020_000,
      infeasibleReason: expect.stringContaining('Ngân sách thấp hơn'),
    });
  });

  it('turns SEARCH_LIMIT into a polite retry hint', async () => {
    const { tool } = setup({ builds: [], infeasibleReason: 'SEARCH_LIMIT' });
    const out = forModel(await tool.run({ budget: 25_000_000, purpose: 'gaming' }, ctx));
    expect(out.infeasibleReason).not.toBe('SEARCH_LIMIT');
    expect(out.note).toMatch(/thử lại/);
    expect(out.minFeasibleBudget).toBeUndefined();
  });

  it('maps excludeProductIds to exclude and mustIncludeProductIds to fixed parts by category', async () => {
    const { tool, recommend } = setup();
    const out = forModel(
      await tool.run(
        {
          budget: 30_000_000,
          purpose: 'gaming',
          excludeProductIds: ['cpu-old', 42],
          mustIncludeProductIds: ['gpu-x', 'ghost'],
        },
        ctx,
      ),
    );
    expect(recommend.calls[0]!.req).toMatchObject({ exclude: ['cpu-old'], fixed: { gpu: 'gpu-x' } });
    expect(out.note).toContain('ghost');
  });
});

describe('planModification', () => {
  const current = build('b1');
  const base = { budget: 25_000_000, purpose: 'gaming' as const, preferences: { color: 'white' as const } };
  const othersFixed = (except: CategoryKey[]) =>
    Object.fromEntries(CATEGORY_KEYS.filter((c) => !except.includes(c)).map((c) => [c, `${c}-b1`]));

  it('keeps every part but the replaced category and excludes the current one', () => {
    const plan = planModification({ build: current, base, args: { replaceCategory: 'gpu' } });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.request).toEqual({
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { color: 'white' },
      fixed: othersFixed(['gpu']),
      exclude: ['gpu-b1'],
    });
    expect(plan.released).toEqual(['gpu']);
  });

  it('fixes the chosen new product in its own category', () => {
    const plan = planModification({
      build: current,
      base,
      args: { newProductId: 'gpu-new' },
      newProduct: { ...product('gpu', 'gpu-new'), stock: 2 },
    });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request.fixed).toEqual({ ...othersFixed(['gpu']), gpu: 'gpu-new' });
    expect(plan.request.exclude).toBeUndefined();
  });

  it('rejects a new product from a different category than replaceCategory', () => {
    const plan = planModification({
      build: current,
      base,
      args: { replaceCategory: 'cpu', newProductId: 'gpu-new' },
      newProduct: product('gpu', 'gpu-new'),
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toMatchObject({ error: 'CATEGORY_MISMATCH' });
  });

  it('rejects an out-of-stock replacement', () => {
    const plan = planModification({
      build: current,
      base,
      args: { newProductId: 'gpu-new' },
      newProduct: { ...product('gpu', 'gpu-new'), stock: 0 },
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toMatchObject({ error: 'OUT_OF_STOCK' });
  });

  it('a budget change alone re-solves the whole build with the remembered preferences', () => {
    const plan = planModification({ build: current, base, args: { budgetDelta: -3_000_000 } });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request).toEqual({ budget: 22_000_000, purpose: 'gaming', preferences: { color: 'white' } });
    expect(plan.released).toEqual([...CATEGORY_KEYS]);
  });

  it('applies budgetDelta together with a replaced category', () => {
    const plan = planModification({
      build: current,
      base,
      args: { replaceCategory: 'gpu', budgetDelta: 3_000_000 },
    });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request.budget).toBe(28_000_000);
    expect(plan.request.fixed).toEqual(othersFixed(['gpu']));
  });

  it('merges preference changes and frees the categories they affect', () => {
    const plan = planModification({
      build: current,
      base,
      args: { preferenceChanges: { gpuBrand: 'AMD', rgb: true } },
    });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request.preferences).toEqual({ color: 'white', gpuBrand: 'AMD' });
    expect(plan.request.fixed).toEqual(othersFixed(['gpu']));
    expect(plan.request.exclude).toBeUndefined();
  });

  it('a CPU brand change frees CPU and mainboard', () => {
    const plan = planModification({
      build: current,
      base,
      args: { preferenceChanges: { cpuBrand: 'Intel' } },
    });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.released).toEqual(['cpu', 'mainboard']);
  });

  it('offers a relaxed request that also frees dependent categories', () => {
    const plan = planModification({ build: current, base, args: { replaceCategory: 'gpu' } });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.relaxed?.released).toEqual(['gpu', 'psu', 'case']);
    expect(plan.relaxed?.request.fixed).toEqual(othersFixed(['gpu', 'psu', 'case']));
    expect(plan.relaxed?.request.exclude).toEqual(['gpu-b1']);
  });

  it('falls back to the build budget and purpose when nothing was remembered', () => {
    const plan = planModification({
      build: build('b9', { budget: 18_000_000, purpose: 'office' }),
      base: null,
      args: { budgetDelta: 2_000_000 },
    });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request).toEqual({ budget: 20_000_000, purpose: 'office', preferences: {} });
  });

  it('clamps the new budget and adds a note', () => {
    const plan = planModification({ build: current, base, args: { budgetDelta: -40_000_000 } });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.request.budget).toBe(MIN_BUDGET);
    expect(plan.notes.join(' ')).toMatch(/đã dùng/);
  });

  it('never fixes a GPU the build does not have', () => {
    const office = build('b2', { categories: CATEGORY_KEYS.filter((c) => c !== 'gpu'), purpose: 'office' });
    const plan = planModification({ build: office, base: null, args: { replaceCategory: 'ram' } });
    if (!plan.ok) throw new Error(plan.error.message);
    expect(Object.keys(plan.request.fixed ?? {}).sort()).toEqual(
      CATEGORY_KEYS.filter((c) => c !== 'gpu' && c !== 'ram').sort(),
    );
  });

  it('asks for at least one change', () => {
    const plan = planModification({ build: current, base, args: { budgetDelta: 0 } });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toMatchObject({ error: 'NO_CHANGES' });
  });
});

describe('modify_build tool', () => {
  function setup(...outcomes: Array<RecommendOutcome | ((req: RecommendationRequest) => RecommendOutcome)>) {
    const recommend = fakeRecommend(...outcomes);
    const requests = memoryBuildRequestStore();
    requests.entries.set('b1', { budget: 25_000_000, purpose: 'gaming', preferences: { cpuBrand: 'AMD' } });
    const builds = new Map([['b1', build('b1')]]);
    const products = new Map([['gpu-new', { ...product('gpu', 'gpu-new'), stock: 4 }]]);
    const tool = createModifyBuildTool({
      recommend,
      requests,
      getBuild: async (id) => builds.get(id) ?? null,
      getProduct: async (id) => products.get(id) ?? null,
    });
    return { recommend, requests, tool };
  }

  it('re-solves with the rest fixed and returns the new builds like recommend_builds', async () => {
    const { tool, recommend, requests } = setup(ok('n1', 'n2'));
    const result = await tool.run({ buildId: 'b1', replaceCategory: 'gpu', budgetDelta: 2_000_000 }, ctx);
    expect(recommend.calls).toHaveLength(1);
    expect(recommend.calls[0]!.meta).toEqual({ source: 'CHAT', userId: 'u1' });
    expect(recommend.calls[0]!.req).toMatchObject({
      budget: 27_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'AMD' },
      exclude: ['gpu-b1'],
    });
    expect(result.buildIds).toEqual(['n1', 'n2']);
    expect(result.events).toEqual([{ type: 'builds', builds: [build('n1'), build('n2')] }]);
    const out = forModel(result);
    expect(out.builds.map((b) => b.id)).toEqual(['n1', 'n2']);
    expect(out.budget).toBe(27_000_000);
    expect(out.changedCategories).toEqual(['Card đồ họa']);
    expect(requests.entries.get('n1')?.preferences).toEqual({ cpuBrand: 'AMD' });
  });

  it('retries with dependent categories freed when the strict re-solve is infeasible', async () => {
    const { tool, recommend } = setup({ builds: [], infeasibleReason: 'FIXED_PART_CONFLICT' }, ok('n3'));
    const result = await tool.run({ buildId: 'b1', replaceCategory: 'gpu' }, ctx);
    expect(recommend.calls).toHaveLength(2);
    expect(Object.keys(recommend.calls[1]!.req.fixed ?? {})).not.toContain('psu');
    const out = forModel(result);
    expect(result.buildIds).toEqual(['n3']);
    expect(out.changedCategories).toEqual(['Card đồ họa', 'Nguồn', 'Vỏ case']);
    expect(out.note).toMatch(/Nguồn/);
  });

  it('reports the relaxed outcome (lower minimum) when both attempts fail', async () => {
    const { tool, recommend } = setup(
      { builds: [], infeasibleReason: 'BUDGET_TOO_LOW', minFeasibleBudget: 31_000_000 },
      { builds: [], infeasibleReason: 'BUDGET_TOO_LOW', minFeasibleBudget: 29_000_000 },
    );
    const out = forModel(await tool.run({ buildId: 'b1', replaceCategory: 'gpu' }, ctx));
    expect(recommend.calls).toHaveLength(2);
    expect(out.builds).toEqual([]);
    expect(out.minFeasibleBudget).toBe(29_000_000);
  });

  it('treats blank optional fields from the model as absent', async () => {
    const { tool, recommend } = setup(ok('n6'));
    await tool.run(
      {
        buildId: ' b1 ',
        replaceCategory: 'gpu',
        newProductId: '',
        budgetDelta: null,
        preferenceChanges: null,
      },
      ctx,
    );
    expect(recommend.calls[0]!.req).toMatchObject({ budget: 25_000_000, exclude: ['gpu-b1'] });
  });

  it('uses the chosen replacement product', async () => {
    const { tool, recommend } = setup(ok('n4'));
    await tool.run({ buildId: 'b1', newProductId: 'gpu-new' }, ctx);
    expect(recommend.calls[0]!.req.fixed?.gpu).toBe('gpu-new');
  });

  it('answers NOT_FOUND for an unknown build or product without calling the engine', async () => {
    const { tool, recommend } = setup(ok('n5'));
    expect((await tool.run({ buildId: 'nope', replaceCategory: 'gpu' }, ctx)).forModel).toMatchObject({
      error: 'NOT_FOUND',
    });
    expect((await tool.run({ buildId: 'b1', newProductId: 'ghost' }, ctx)).forModel).toMatchObject({
      error: 'NOT_FOUND',
    });
    expect((await tool.run({ replaceCategory: 'gpu' }, ctx)).forModel).toMatchObject({
      error: 'INVALID_ARGUMENTS',
    });
    expect(recommend.calls).toHaveLength(0);
  });
});
