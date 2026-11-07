import type { AnySpecs, CategoryKey, ProductDTO } from '@pc/shared';

/** Small hand-made catalogue for builder unit tests. */
export function product(
  id: string,
  category: CategoryKey,
  specs: AnySpecs,
  price = 1_000_000,
  extra: Partial<ProductDTO> = {},
): ProductDTO {
  return {
    id,
    slug: id,
    sku: id.toUpperCase(),
    name: id,
    brand: 'Test',
    category,
    price,
    salePrice: null,
    stock: 10,
    image: null,
    keySpecs: {},
    images: [],
    specs,
    benchmark: null,
    description: null,
    commercialBoost: 0,
    ...extra,
  };
}

export const AM5_CPU = product('r5-7600', 'cpu', {
  socket: 'AM5',
  cores: 6,
  threads: 12,
  baseClockGHz: 4.7,
  boostClockGHz: 5.3,
  tdpW: 65,
  integratedGraphics: true,
  memoryTypes: ['DDR5'],
});

export const LGA1700_CPU = product('i5-12400f', 'cpu', {
  socket: 'LGA1700',
  cores: 6,
  threads: 12,
  baseClockGHz: 2.5,
  boostClockGHz: 4.4,
  tdpW: 65,
  integratedGraphics: false,
  memoryTypes: ['DDR4', 'DDR5'],
});

export const B650_BOARD = product('b650m', 'mainboard', {
  socket: 'AM5',
  chipset: 'B650',
  formFactor: 'mATX',
  memoryType: 'DDR5',
  memorySlots: 4,
  maxMemoryGB: 192,
  m2Slots: 2,
  wifi: true,
  color: 'black',
});

export const DDR5_KIT = product('ddr5-32', 'ram', {
  type: 'DDR5',
  capacityGB: 32,
  modules: 2,
  speedMHz: 6000,
  casLatency: 30,
  rgb: false,
  color: 'black',
});

export const DDR4_KIT = product('ddr4-16', 'ram', {
  type: 'DDR4',
  capacityGB: 16,
  modules: 2,
  speedMHz: 3200,
  casLatency: 16,
  rgb: false,
  color: 'black',
});

export const BIG_GPU = product(
  'rtx-4070',
  'gpu',
  {
    chipset: 'RTX 4070',
    chipsetBrand: 'NVIDIA',
    vramGB: 12,
    lengthMm: 340,
    tgpW: 200,
    recommendedPsuW: 650,
    color: 'black',
  },
  15_000_000,
);

export const SMALL_CASE = product('mini-case', 'case', {
  supportedFormFactors: ['mATX', 'ITX'],
  maxGpuLengthMm: 300,
  maxCoolerHeightMm: 160,
  radiatorSupportMm: [240],
  psuFormFactors: ['ATX'],
  color: 'white',
});

export const WEAK_PSU = product('psu-400', 'psu', {
  wattage: 400,
  efficiency: '80+ Bronze',
  formFactor: 'ATX',
  modular: false,
  color: 'black',
});
