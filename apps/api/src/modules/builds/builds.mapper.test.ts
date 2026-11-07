import type { EngineProduct } from '@pc/engine';
import { describe, expect, it } from 'vitest';
import type { builds } from '../../db/schema';
import type { ProductWithRefs } from '../../lib/products';
import { storedItems, toBuildDTO } from './builds.mapper';

const productRow = (id: string, price: number): ProductWithRefs => ({
  product: {
    id,
    categoryId: 'c1',
    brandId: 'b1',
    sku: `SKU-${id}`,
    slug: `slug-${id}`,
    name: `Product ${id}`,
    price,
    salePrice: null,
    stock: 4,
    reserved: 1,
    images: ['/img.png'],
    specs: { socket: 'AM5', cores: 6 },
    description: null,
    status: 'ACTIVE',
    commercialBoost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  brandName: 'AMD',
  categoryKey: 'cpu',
  benchmark: null,
});

const row: typeof builds.$inferSelect = {
  id: 'b-1',
  userId: null,
  name: 'Cấu hình thử',
  label: 'balanced',
  purpose: 'gaming',
  budget: 20_000_000,
  items: [
    { category: 'cpu', productId: 'p1', name: 'Product p1 (lúc lưu)', price: 5_000_000 },
    { category: 'gpu', productId: 'gone', name: 'Card đã ngừng bán', price: 9_000_000 },
  ],
  totalPrice: 14_000_000,
  score: 71.5,
  scoreBreakdown: { cpu: 80, gpu: 65 },
  allocation: { cpu: 0.3571, gpu: 0.6429 },
  estimatedWattage: 300,
  recommendedPsuWattage: 450,
  warnings: [],
  source: 'FORM',
  createdAt: new Date('2026-11-07T10:00:00.000Z'),
};

describe('toBuildDTO', () => {
  it('hydrates items with current product summaries and keeps stored totals', () => {
    const dto = toBuildDTO(row, new Map([['p1', productRow('p1', 5_500_000)]]));
    expect(dto).toMatchObject({
      id: 'b-1',
      label: 'balanced',
      purpose: 'gaming',
      totalPrice: 14_000_000,
      score: 71.5,
      source: 'FORM',
      createdAt: '2026-11-07T10:00:00.000Z',
    });
    expect(dto.items[0]).toEqual({
      category: 'cpu',
      product: expect.objectContaining({ id: 'p1', price: 5_500_000, stock: 3, slug: 'slug-p1' }),
    });
  });

  it('falls back to the stored snapshot when a product no longer exists', () => {
    const dto = toBuildDTO(row, new Map());
    expect(dto.items[1]).toEqual({
      category: 'gpu',
      product: {
        id: 'gone',
        slug: '',
        sku: '',
        name: 'Card đã ngừng bán',
        brand: '',
        category: 'gpu',
        price: 9_000_000,
        salePrice: null,
        stock: 0,
        image: null,
        keySpecs: {},
      },
    });
  });
});

describe('storedItems', () => {
  it('snapshots parts in category order with name and price', () => {
    const part = (id: string, category: EngineProduct['category'], price: number) =>
      ({
        id,
        category,
        name: id.toUpperCase(),
        brand: 'X',
        price,
        stock: 1,
        specs: {},
      }) as unknown as EngineProduct;
    expect(storedItems({ gpu: part('g', 'gpu', 2), cpu: part('c', 'cpu', 1) })).toEqual([
      { category: 'cpu', productId: 'c', name: 'C', price: 1 },
      { category: 'gpu', productId: 'g', name: 'G', price: 2 },
    ]);
  });
});
