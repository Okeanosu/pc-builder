import { describe, expect, it } from 'vitest';
import {
  availableStock,
  effectivePrice,
  type ProductWithRefs,
  toEngineProduct,
  toProductSummary,
} from './products';

const row: ProductWithRefs = {
  product: {
    id: 'p1',
    categoryId: 'c1',
    brandId: 'b1',
    sku: 'CPU-AMD-R5-7600',
    slug: 'amd-ryzen-5-7600',
    name: 'AMD Ryzen 5 7600',
    price: 5_000_000,
    salePrice: 4_650_000,
    stock: 5,
    reserved: 2,
    images: [],
    specs: { socket: 'AM5', cores: 6, threads: 12, boostClockGHz: 5.1, memoryTypes: ['DDR5'], tdpW: 65 },
    description: null,
    status: 'ACTIVE',
    commercialBoost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  brandName: 'AMD',
  categoryKey: 'cpu',
  benchmark: {
    productId: 'p1',
    cpuSingle: 1900,
    cpuMulti: 15000,
    gpuScore: null,
    source: null,
    updatedAt: new Date(),
  },
};

describe('product mappers', () => {
  it('exposes buyable stock and headline specs on the summary', () => {
    const s = toProductSummary(row);
    expect(s.stock).toBe(3);
    expect(s.image).toBeNull();
    expect(s.keySpecs).toEqual({ socket: 'AM5', cores: 6, threads: 12, boostClockGHz: 5.1 });
  });

  it('feeds the engine the sale price and buyable stock', () => {
    const e = toEngineProduct(row);
    expect(e.price).toBe(4_650_000);
    expect(e.stock).toBe(3);
    expect(e.benchmark).toEqual({ cpuSingle: 1900, cpuMulti: 15000, gpuScore: undefined });
  });

  it('never reports negative stock', () => {
    expect(availableStock({ stock: 1, reserved: 3 })).toBe(0);
    expect(effectivePrice({ price: 10, salePrice: null })).toBe(10);
  });
});
