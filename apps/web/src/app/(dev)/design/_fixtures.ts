import type { CategoryKey, CompatibilityIssueDTO, ProductSummaryDTO, SpecField } from '@pc/shared';

export const CPU_FIELDS: SpecField[] = [
  { key: 'socket', label: 'Socket', type: 'enum', required: true, filterable: true },
  { key: 'cores', label: 'Số nhân', type: 'number', required: true, filterable: true },
  { key: 'threads', label: 'Số luồng', type: 'number', required: true, filterable: false },
  {
    key: 'baseClockGHz',
    label: 'Xung cơ bản',
    type: 'number',
    unit: 'GHz',
    required: true,
    filterable: false,
  },
  {
    key: 'boostClockGHz',
    label: 'Xung boost',
    type: 'number',
    unit: 'GHz',
    required: true,
    filterable: false,
  },
  { key: 'tdpW', label: 'TDP', type: 'number', unit: 'W', required: true, filterable: false },
  { key: 'integratedGraphics', label: 'Đồ họa tích hợp', type: 'boolean', required: true, filterable: true },
  { key: 'memoryTypes', label: 'Hỗ trợ RAM', type: 'enum[]', required: true, filterable: true },
];

export const CPU_SPECS = {
  socket: 'LGA1700',
  cores: 14,
  threads: 20,
  baseClockGHz: 3.5,
  boostClockGHz: 5.3,
  tdpW: 125,
  integratedGraphics: true,
  memoryTypes: ['DDR4', 'DDR5'],
};

const base = { image: null, sku: 'DEMO' } as const;

export const PRODUCTS: ProductSummaryDTO[] = [
  {
    ...base,
    id: 'gpu-5060ti-16',
    slug: 'asus-dual-rtx-5060-ti-16gb-oc',
    name: 'ASUS Dual GeForce RTX 5060 Ti 16GB OC',
    brand: 'ASUS',
    category: 'gpu',
    price: 13_490_000,
    salePrice: 12_290_000,
    stock: 14,
    keySpecs: { chipset: 'RTX 5060 Ti', vramGB: 16, tgpW: 180 },
  },
  {
    ...base,
    id: 'cpu-7600x',
    slug: 'amd-ryzen-5-7600x',
    name: 'AMD Ryzen 5 7600X',
    brand: 'AMD',
    category: 'cpu',
    price: 4_990_000,
    salePrice: null,
    stock: 3,
    keySpecs: { socket: 'AM5', cores: 6, threads: 12 },
  },
  {
    ...base,
    id: 'ram-fury-32',
    slug: 'kingston-fury-beast-32gb-ddr5-6000',
    name: 'Kingston FURY Beast 32GB (2x16GB) DDR5 6000MHz',
    brand: 'Kingston',
    category: 'ram',
    price: 2_890_000,
    salePrice: 2_590_000,
    stock: 40,
    keySpecs: { type: 'DDR5', capacityGB: 32, speedMHz: 6000 },
  },
  {
    ...base,
    id: 'case-216',
    slug: 'lian-li-lancool-216-rgb',
    name: 'Lian Li Lancool 216 RGB Black',
    brand: 'Lian Li',
    category: 'case',
    price: 2_390_000,
    salePrice: null,
    stock: 0,
    keySpecs: { formFactor: 'ATX', maxGpuLengthMm: 392, color: 'black' },
  },
];

export const PICKER_PRODUCTS: ProductSummaryDTO[] = [
  {
    ...base,
    id: 'gpu-5070',
    slug: 'msi-rtx-5070-ventus-2x-12g',
    name: 'MSI GeForce RTX 5070 Ventus 2X 12G OC',
    brand: 'MSI',
    category: 'gpu',
    price: 16_990_000,
    salePrice: null,
    stock: 8,
    keySpecs: { chipset: 'RTX 5070', vramGB: 12, lengthMm: 242 },
  },
  {
    ...base,
    id: 'gpu-9060xt',
    slug: 'sapphire-pulse-rx-9060-xt-16gb',
    name: 'Sapphire Pulse Radeon RX 9060 XT 16GB',
    brand: 'Sapphire',
    category: 'gpu',
    price: 9_990_000,
    salePrice: null,
    stock: 2,
    keySpecs: { chipset: 'RX 9060 XT', vramGB: 16, lengthMm: 240 },
  },
  {
    ...base,
    id: 'gpu-5060',
    slug: 'gigabyte-rtx-5060-windforce-8g',
    name: 'Gigabyte GeForce RTX 5060 Windforce OC 8G',
    brand: 'Gigabyte',
    category: 'gpu',
    price: 8_490_000,
    salePrice: 7_990_000,
    stock: 21,
    keySpecs: { chipset: 'RTX 5060', vramGB: 8, lengthMm: 199 },
  },
];

export const BUILD_AMOUNTS: Record<CategoryKey, number> = {
  cpu: 4_290_000,
  mainboard: 3_090_000,
  ram: 2_490_000,
  gpu: 9_990_000,
  storage: 1_590_000,
  psu: 1_690_000,
  case: 1_290_000,
  cooler: 550_000,
};
export const BUILD_TOTAL = Object.values(BUILD_AMOUNTS).reduce((a, b) => a + b, 0);
export const BUILD_ALLOCATION = Object.fromEntries(
  Object.entries(BUILD_AMOUNTS).map(([k, v]) => [k, v / BUILD_TOTAL]),
) as Record<CategoryKey, number>;

export const ISSUES_ERROR: Pick<CompatibilityIssueDTO, 'code' | 'severity' | 'message'>[] = [
  { code: 'C01', severity: 'error', message: 'Socket CPU (LGA1700) không khớp với mainboard (AM5).' },
  { code: 'C05', severity: 'error', message: 'Card đồ họa dài 336 mm, vỏ case chỉ chứa tối đa 320 mm.' },
];
export const ISSUES_WARNING: Pick<CompatibilityIssueDTO, 'code' | 'severity' | 'message'>[] = [
  { code: 'C13', severity: 'warning', message: 'CPU yếu hơn GPU 3 bậc, dễ nghẽn cổ chai khi chơi game.' },
];
