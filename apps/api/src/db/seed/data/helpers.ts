import type { Benchmark, CategoryKey, SpecsByCategory } from '@pc/shared';

export interface SeedProduct<K extends CategoryKey = CategoryKey> {
  sku: string;
  brand: string;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  specs: SpecsByCategory[K];
  benchmark?: Benchmark;
  description: string;
  commercialBoost?: number;
}

const BRAND_CODES: Record<string, string> = {
  'Cooler Master': 'CM',
  Thermalright: 'TR',
  'SK hynix': 'HYNIX',
  'be quiet!': 'BQ',
  'Lian Li': 'LIANLI',
  'G.Skill': 'GSKILL',
  TeamGroup: 'TEAM',
  'Western Digital': 'WD',
};

const SKU_PREFIX: Record<CategoryKey, string> = {
  cpu: 'CPU',
  mainboard: 'MB',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'SSD',
  psu: 'PSU',
  case: 'CASE',
  cooler: 'COOL',
};

export function sku(category: CategoryKey, brand: string, code: string): string {
  const brandCode = BRAND_CODES[brand] ?? brand.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${SKU_PREFIX[category]}-${brandCode}-${code}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ALL_SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'] as const;
