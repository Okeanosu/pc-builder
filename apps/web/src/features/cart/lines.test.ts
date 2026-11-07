import type { CartItemDTO, ProductSummaryDTO } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { assemblableBuildId, groupCartLines, isBuildComplete } from './lines';

const product = (id: string, price = 1_000_000): ProductSummaryDTO => ({
  id,
  slug: id,
  sku: id,
  name: id,
  brand: 'X',
  category: 'cpu',
  price,
  salePrice: null,
  stock: 10,
  image: null,
  keySpecs: {},
});

const line = (
  id: string,
  productId: string,
  buildId: string | null,
  qty = 1,
  price = 1_000_000,
): CartItemDTO => ({
  id,
  product: product(productId, price),
  qty,
  buildId,
  lineTotal: price * qty,
});

const build = (...productIds: string[]) => ({ items: productIds.map((id) => ({ product: product(id) })) });

describe('groupCartLines', () => {
  it('splits retail lines from build groups and sums each group', () => {
    const g = groupCartLines([
      line('1', 'cpu', 'b1'),
      line('2', 'ssd', null, 2, 500_000),
      line('3', 'gpu', 'b1', 1, 9_000_000),
      line('4', 'ram', 'b2'),
    ]);
    expect(g.retail.map((l) => l.id)).toEqual(['2']);
    expect(g.builds.map((b) => [b.buildId, b.items.length, b.subtotal])).toEqual([
      ['b1', 2, 10_000_000],
      ['b2', 1, 1_000_000],
    ]);
  });

  it('handles an empty cart', () => {
    expect(groupCartLines([])).toEqual({ retail: [], builds: [] });
  });
});

describe('isBuildComplete', () => {
  const group = groupCartLines([line('1', 'a', 'b'), line('2', 'b', 'b')]).builds[0]!;

  it('is true when every build part is in the group', () => {
    expect(isBuildComplete(build('a', 'b'), group)).toBe(true);
  });

  it('is false when a part was removed', () => {
    expect(isBuildComplete(build('a', 'b', 'c'), group)).toBe(false);
  });

  it('respects quantities for repeated parts', () => {
    expect(isBuildComplete(build('a', 'a', 'b'), group)).toBe(false);
    const doubled = groupCartLines([line('1', 'a', 'b', 2), line('2', 'b', 'b')]).builds[0]!;
    expect(isBuildComplete(build('a', 'a', 'b'), doubled)).toBe(true);
  });

  it('is false for an empty build', () => {
    expect(isBuildComplete({ items: [] }, group)).toBe(false);
  });
});

describe('assemblableBuildId', () => {
  it('returns the id of the only, complete build group', () => {
    const g = groupCartLines([line('1', 'a', 'b1'), line('2', 'x', null)]);
    expect(assemblableBuildId(g, new Map([['b1', build('a')]]))).toBe('b1');
  });

  it('returns null with two build groups, an incomplete group or an unknown build', () => {
    const two = groupCartLines([line('1', 'a', 'b1'), line('2', 'c', 'b2')]);
    expect(
      assemblableBuildId(
        two,
        new Map([
          ['b1', build('a')],
          ['b2', build('c')],
        ]),
      ),
    ).toBeNull();
    const one = groupCartLines([line('1', 'a', 'b1')]);
    expect(assemblableBuildId(one, new Map([['b1', build('a', 'z')]]))).toBeNull();
    expect(assemblableBuildId(one, new Map())).toBeNull();
    expect(assemblableBuildId(groupCartLines([line('1', 'a', null)]), new Map())).toBeNull();
  });
});
