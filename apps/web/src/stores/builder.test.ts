// @vitest-environment jsdom
import type { BuildDTO, ProductDTO } from '@pc/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AM5_CPU, B650_BOARD, BIG_GPU, DDR5_KIT, LGA1700_CPU } from '@/features/builder/fixtures';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: apiMock,
}));

const { BUILDER_STORAGE_KEY, buildSignature, describeBuildForAdvisor, useBuilderStore } = await import(
  './builder'
);

const CATALOG: Record<string, ProductDTO> = Object.fromEntries(
  [AM5_CPU, LGA1700_CPU, B650_BOARD, DDR5_KIT, BIG_GPU].map((p) => [p.id, p]),
);

const SAVED: BuildDTO = {
  id: 'build-1',
  name: 'Cân bằng',
  label: 'balanced',
  purpose: 'graphics',
  budget: 30_000_000,
  source: 'CHAT',
  items: [AM5_CPU, B650_BOARD, DDR5_KIT].map((p) => ({ category: p.category, product: p })),
  totalPrice: 3_000_000,
  score: 70,
  scoreBreakdown: {},
  allocation: {},
  estimatedWattage: 140,
  recommendedPsuWattage: 200,
  warnings: [],
  createdAt: '',
};

beforeEach(() => {
  localStorage.clear();
  apiMock.mockReset();
  apiMock.mockImplementation(async (path: string) => {
    if (path === '/builds/build-1') return SAVED;
    const id = decodeURIComponent(path.replace('/products/', ''));
    const p = CATALOG[id];
    if (!p) throw new Error(`unexpected ${path}`);
    return p;
  });
  useBuilderStore.getState().clear();
  useBuilderStore.setState({ purpose: 'gaming', budget: null });
});

describe('useBuilderStore', () => {
  it('add() fetches the full product and puts it in its category slot', async () => {
    await useBuilderStore.getState().add('r5-7600');
    expect(apiMock).toHaveBeenCalledWith('/products/r5-7600');
    expect(useBuilderStore.getState().parts.cpu?.specs).toEqual(AM5_CPU.specs);
  });

  it('a second CPU replaces the first', async () => {
    useBuilderStore.getState().setPart(AM5_CPU);
    useBuilderStore.getState().setPart(LGA1700_CPU);
    expect(useBuilderStore.getState().parts.cpu?.id).toBe('i5-12400f');
  });

  it('loadBuild() replaces every slot with full products and copies purpose and budget', async () => {
    useBuilderStore.getState().setPart(BIG_GPU);
    await useBuilderStore.getState().loadBuild('build-1');
    const s = useBuilderStore.getState();
    expect(Object.keys(s.parts).sort()).toEqual(['cpu', 'mainboard', 'ram']);
    expect(s.parts.mainboard?.specs).toEqual(B650_BOARD.specs);
    expect(s.purpose).toBe('graphics');
    expect(s.budget).toBe(30_000_000);
    expect(s.saved?.id).toBe('build-1');
    expect(s.saved?.signature).toBe(buildSignature(s));
  });

  it('a change after loading makes the saved build stale', async () => {
    await useBuilderStore.getState().loadBuild('build-1');
    useBuilderStore.getState().setPart(BIG_GPU);
    expect(useBuilderStore.getState().saved?.signature).not.toBe(buildSignature(useBuilderStore.getState()));
  });

  it('persists slots, purpose and budget to localStorage', () => {
    useBuilderStore.getState().setPart(AM5_CPU);
    useBuilderStore.getState().setBudget(25_000_000);
    const raw = JSON.parse(localStorage.getItem(BUILDER_STORAGE_KEY) ?? '{}');
    expect(raw.state.parts.cpu.id).toBe('r5-7600');
    expect(raw.state.budget).toBe(25_000_000);
  });

  it('survives a storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => useBuilderStore.getState().setPart(AM5_CPU)).not.toThrow();
    expect(useBuilderStore.getState().parts.cpu?.id).toBe('r5-7600');
    spy.mockRestore();
  });

  it('remove() empties a slot', () => {
    useBuilderStore.getState().setPart(AM5_CPU);
    useBuilderStore.getState().remove('cpu');
    expect(useBuilderStore.getState().parts.cpu).toBeUndefined();
  });
});

describe('describeBuildForAdvisor', () => {
  it('summarises purpose, budget and chosen parts in Vietnamese', () => {
    const text = describeBuildForAdvisor({
      parts: { cpu: AM5_CPU, gpu: BIG_GPU },
      purpose: 'gaming',
      budget: 25_000_000,
    });
    expect(text).toMatch(/chơi game/i);
    expect(text).toContain('25.000.000₫');
    expect(text).toContain('CPU: r5-7600');
    expect(text).toContain('Card đồ họa: rtx-4070');
    expect(text).toMatch(/tối ưu/);
  });
});
