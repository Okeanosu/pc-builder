import type {
  AdminProductCreateInput,
  AdminProductDTO,
  AdminProductPatchInput,
  ProductStatus,
  SpecField,
} from '@pc/shared';
import type { FieldErrors } from '../errors';
import { draftToSpecs, type SpecDraft, specsToDraft } from './spec-form';

/** Engine clamps the boost to 0..1 and the API caps it at 0.5, so the editable band is 0..0.5. */
export const BOOST_MIN = 0;
export const BOOST_MAX = 0.5;

export interface ProductDraft {
  categoryId: string;
  name: string;
  brand: string;
  sku: string;
  slug: string;
  price: number | null;
  salePrice: number | null;
  stock: number | null;
  status: ProductStatus;
  description: string;
  images: string;
  commercialBoost: number;
  specs: SpecDraft;
}

/** Top-level inputs that a server issue path can point at. */
export const PRODUCT_FIELDS = [
  'categoryId',
  'name',
  'brand',
  'sku',
  'slug',
  'price',
  'salePrice',
  'stock',
  'status',
  'description',
  'images',
  'commercialBoost',
] as const;

export function emptyProductDraft(categoryId: string, fields: SpecField[]): ProductDraft {
  return {
    categoryId,
    name: '',
    brand: '',
    sku: '',
    slug: '',
    price: null,
    salePrice: null,
    stock: 0,
    status: 'ACTIVE',
    description: '',
    images: '',
    commercialBoost: 0,
    specs: specsToDraft(fields, {}),
  };
}

export function productToDraft(p: AdminProductDTO, fields: SpecField[]): ProductDraft {
  return {
    categoryId: p.categoryId,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    slug: p.slug,
    price: p.price,
    salePrice: p.salePrice,
    stock: null,
    status: p.status,
    description: p.description ?? '',
    images: p.images.join('\n'),
    commercialBoost: p.commercialBoost,
    specs: specsToDraft(fields, p.specs as unknown as Record<string, unknown>),
  };
}

const imageList = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const clampBoost = (n: number) => Math.min(BOOST_MAX, Math.max(BOOST_MIN, Math.round(n * 100) / 100));

function topLevelErrors(d: ProductDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (d.name.trim().length < 2) errors.name = 'Nhập tên sản phẩm (ít nhất 2 ký tự)';
  if (!d.brand.trim()) errors.brand = 'Nhập hãng sản xuất';
  if (!d.sku.trim()) errors.sku = 'Nhập mã SKU';
  if (d.price === null || d.price <= 0) errors.price = 'Nhập giá bán lớn hơn 0';
  else if (d.salePrice !== null && d.salePrice >= d.price) {
    errors.salePrice = 'Giá khuyến mãi phải nhỏ hơn giá bán';
  }
  if (!d.categoryId) errors.categoryId = 'Chọn danh mục';
  return errors;
}

export type ProductPayload =
  | { kind: 'create'; input: AdminProductCreateInput }
  | { kind: 'patch'; input: AdminProductPatchInput };

/**
 * Validates presence and parses the draft. For an edit, only fields that differ from `original`
 * are sent, so a value the form cannot represent (e.g. a negative legacy boost) is left untouched.
 */
export function buildProductPayload(
  draft: ProductDraft,
  fields: SpecField[],
  original?: AdminProductDTO,
): { payload: ProductPayload | null; errors: FieldErrors } {
  const base = (original?.specs ?? {}) as unknown as Record<string, unknown>;
  const { specs, errors: specErrors } = draftToSpecs(fields, draft.specs, base);
  const errors = { ...topLevelErrors(draft), ...specErrors };
  if (Object.keys(errors).length > 0) return { payload: null, errors };

  const full = {
    categoryId: draft.categoryId,
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    sku: draft.sku.trim(),
    price: draft.price as number,
    salePrice: draft.salePrice,
    description: draft.description.trim() ? draft.description.trim() : null,
    images: imageList(draft.images),
    status: draft.status,
    commercialBoost: clampBoost(draft.commercialBoost),
    specs,
  };

  if (!original) {
    const slug = draft.slug.trim();
    return {
      payload: {
        kind: 'create',
        input: { ...full, ...(slug ? { slug } : {}), stock: draft.stock ?? 0 },
      },
      errors: {},
    };
  }

  const patch: AdminProductPatchInput = {};
  if (full.name !== original.name) patch.name = full.name;
  if (full.brand !== original.brand) patch.brand = full.brand;
  if (full.sku !== original.sku) patch.sku = full.sku;
  const slug = draft.slug.trim();
  if (slug && slug !== original.slug) patch.slug = slug;
  if (full.price !== original.price) patch.price = full.price;
  if (full.salePrice !== original.salePrice) patch.salePrice = full.salePrice;
  if (full.description !== (original.description ?? null)) patch.description = full.description;
  if (JSON.stringify(full.images) !== JSON.stringify(original.images)) patch.images = full.images;
  if (full.status !== original.status) patch.status = full.status;
  if (Math.abs(draft.commercialBoost - original.commercialBoost) > 1e-9) {
    patch.commercialBoost = full.commercialBoost;
  }
  if (JSON.stringify(sortKeys(specs)) !== JSON.stringify(sortKeys(base))) patch.specs = specs;
  return { payload: { kind: 'patch', input: patch }, errors: {} };
}

function sortKeys(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}
