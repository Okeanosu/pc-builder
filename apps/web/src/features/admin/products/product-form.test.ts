import type { AdminProductDTO, SpecField } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { buildProductPayload, emptyProductDraft, productToDraft } from './product-form';

const fields: SpecField[] = [
  { key: 'socket', label: 'Socket', type: 'enum', options: ['AM5'], required: true, filterable: true },
  { key: 'cores', label: 'Số nhân', type: 'number', required: true, filterable: true },
];

const product: AdminProductDTO = {
  id: 'p1',
  slug: 'ryzen-5-7600',
  sku: 'CPU-7600',
  name: 'AMD Ryzen 5 7600',
  brand: 'AMD',
  category: 'cpu',
  price: 5_000_000,
  salePrice: null,
  stock: 10,
  image: null,
  keySpecs: {},
  images: [],
  specs: { socket: 'AM5', cores: 6, threads: 12 } as unknown as AdminProductDTO['specs'],
  benchmark: null,
  description: null,
  commercialBoost: -0.2,
  status: 'ACTIVE',
  categoryId: 'c1',
  stockOnHand: 12,
  reserved: 2,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('buildProductPayload (create)', () => {
  it('requires the basics before calling the server', () => {
    const { payload, errors } = buildProductPayload(emptyProductDraft('c1', fields), fields);
    expect(payload).toBeNull();
    expect(Object.keys(errors).sort()).toEqual([
      'brand',
      'name',
      'price',
      'sku',
      'specs.cores',
      'specs.socket',
    ]);
  });

  it('builds a create input with parsed specs and initial stock', () => {
    const draft = {
      ...emptyProductDraft('c1', fields),
      name: 'Ryzen 5 9600',
      brand: 'AMD',
      sku: 'CPU-9600',
      price: 6_500_000,
      stock: 5,
      commercialBoost: 0.234,
      specs: { socket: 'AM5', cores: '6' },
    };
    const { payload } = buildProductPayload(draft, fields);
    expect(payload).toEqual({
      kind: 'create',
      input: expect.objectContaining({
        name: 'Ryzen 5 9600',
        stock: 5,
        commercialBoost: 0.23,
        specs: { socket: 'AM5', cores: 6 },
        salePrice: null,
        description: null,
      }),
    });
    expect(payload?.input).not.toHaveProperty('slug');
  });
});

describe('buildProductPayload (edit)', () => {
  it('sends only what changed and never touches stock', () => {
    const draft = { ...productToDraft(product, fields), price: 4_800_000 };
    const { payload } = buildProductPayload(draft, fields, product);
    expect(payload).toEqual({ kind: 'patch', input: { price: 4_800_000 } });
  });

  it('sends the whole specs object when one spec changes, keeping hidden keys', () => {
    const draft = productToDraft(product, fields);
    draft.specs = { ...draft.specs, cores: '8' };
    const { payload } = buildProductPayload(draft, fields, product);
    expect(payload).toEqual({ kind: 'patch', input: { specs: { socket: 'AM5', cores: 8, threads: 12 } } });
  });

  it('keeps a legacy negative boost unless the slider moved', () => {
    const untouched = buildProductPayload(productToDraft(product, fields), fields, product);
    expect(untouched.payload).toEqual({ kind: 'patch', input: {} });
    const moved = buildProductPayload(
      { ...productToDraft(product, fields), commercialBoost: 0.3 },
      fields,
      product,
    );
    expect(moved.payload?.input).toEqual({ commercialBoost: 0.3 });
  });
});
