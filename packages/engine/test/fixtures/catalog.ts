import type {
  Benchmark,
  CaseSpecs,
  CategoryKey,
  CoolerSpecs,
  CpuSpecs,
  GpuSpecs,
  MainboardSpecs,
  PsuSpecs,
  RamSpecs,
  SpecsByCategory,
  StorageSpecs,
} from '@pc/shared';
import type { EngineProduct } from '../../src/types';

function product<K extends CategoryKey>(
  category: K,
  id: string,
  name: string,
  brand: string,
  price: number,
  specs: SpecsByCategory[K],
  extra: { benchmark?: Benchmark; stock?: number; commercialBoost?: number } = {},
): EngineProduct {
  const { stock = 10, ...rest } = extra;
  return { ...rest, id, category, name, brand, price, stock, specs };
}

const cpu = (
  id: string,
  name: string,
  brand: string,
  price: number,
  specs: CpuSpecs,
  benchmark: Benchmark,
  stock?: number,
) => product('cpu', id, name, brand, price, specs, { benchmark, stock });
const gpu = (
  id: string,
  name: string,
  brand: string,
  price: number,
  specs: GpuSpecs,
  benchmark: Benchmark,
  stock?: number,
) => product('gpu', id, name, brand, price, specs, { benchmark, stock });
const mainboard = (id: string, name: string, brand: string, price: number, specs: MainboardSpecs) =>
  product('mainboard', id, name, brand, price, specs);
const ram = (id: string, name: string, brand: string, price: number, specs: RamSpecs) =>
  product('ram', id, name, brand, price, specs);
const storage = (id: string, name: string, brand: string, price: number, specs: StorageSpecs) =>
  product('storage', id, name, brand, price, specs);
const psu = (id: string, name: string, brand: string, price: number, specs: PsuSpecs) =>
  product('psu', id, name, brand, price, specs);
const pcCase = (id: string, name: string, brand: string, price: number, specs: CaseSpecs) =>
  product('case', id, name, brand, price, specs);
const cooler = (id: string, name: string, brand: string, price: number, specs: CoolerSpecs) =>
  product('cooler', id, name, brand, price, specs);

export const CPUS: EngineProduct[] = [
  cpu(
    'cpu-r5-5600',
    'AMD Ryzen 5 5600',
    'AMD',
    2_690_000,
    {
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClockGHz: 3.5,
      boostClockGHz: 4.4,
      tdpW: 65,
      integratedGraphics: false,
      memoryTypes: ['DDR4'],
    },
    { cpuSingle: 1550, cpuMulti: 11300 },
  ),
  cpu(
    'cpu-r5-5600g',
    'AMD Ryzen 5 5600G',
    'AMD',
    3_190_000,
    {
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClockGHz: 3.9,
      boostClockGHz: 4.4,
      tdpW: 65,
      integratedGraphics: true,
      memoryTypes: ['DDR4'],
    },
    { cpuSingle: 1450, cpuMulti: 10600 },
  ),
  cpu(
    'cpu-r5-7600',
    'AMD Ryzen 5 7600',
    'AMD',
    4_990_000,
    {
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClockGHz: 3.8,
      boostClockGHz: 5.1,
      tdpW: 65,
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    },
    { cpuSingle: 1900, cpuMulti: 14800 },
  ),
  cpu(
    'cpu-r7-7800x3d',
    'AMD Ryzen 7 7800X3D',
    'AMD',
    10_990_000,
    {
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClockGHz: 4.2,
      boostClockGHz: 5.0,
      tdpW: 120,
      integratedGraphics: true,
      memoryTypes: ['DDR5'],
    },
    { cpuSingle: 1780, cpuMulti: 18200 },
  ),
  cpu(
    'cpu-i3-12100f',
    'Intel Core i3-12100F',
    'Intel',
    2_190_000,
    {
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClockGHz: 3.3,
      boostClockGHz: 4.3,
      tdpW: 58,
      integratedGraphics: false,
      memoryTypes: ['DDR4', 'DDR5'],
    },
    { cpuSingle: 1700, cpuMulti: 8700 },
  ),
  cpu(
    'cpu-i5-12400',
    'Intel Core i5-12400',
    'Intel',
    3_790_000,
    {
      socket: 'LGA1700',
      cores: 6,
      threads: 12,
      baseClockGHz: 2.5,
      boostClockGHz: 4.4,
      tdpW: 65,
      integratedGraphics: true,
      memoryTypes: ['DDR4', 'DDR5'],
    },
    { cpuSingle: 1750, cpuMulti: 12300 },
  ),
  cpu(
    'cpu-i5-13400f',
    'Intel Core i5-13400F',
    'Intel',
    4_690_000,
    {
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClockGHz: 2.5,
      boostClockGHz: 4.6,
      tdpW: 65,
      integratedGraphics: false,
      memoryTypes: ['DDR4', 'DDR5'],
    },
    { cpuSingle: 1850, cpuMulti: 16000 },
  ),
  cpu(
    'cpu-i7-14700k',
    'Intel Core i7-14700K',
    'Intel',
    9_990_000,
    {
      socket: 'LGA1700',
      cores: 20,
      threads: 28,
      baseClockGHz: 3.4,
      boostClockGHz: 5.6,
      tdpW: 125,
      integratedGraphics: true,
      memoryTypes: ['DDR4', 'DDR5'],
    },
    { cpuSingle: 2200, cpuMulti: 35000 },
  ),
];

export const MAINBOARDS: EngineProduct[] = [
  mainboard('mb-b450m', 'MSI B450M PRO-VDH MAX', 'MSI', 1_890_000, {
    socket: 'AM4',
    chipset: 'B450',
    formFactor: 'mATX',
    memoryType: 'DDR4',
    memorySlots: 4,
    maxMemoryGB: 128,
    m2Slots: 1,
    wifi: false,
    color: 'black',
  }),
  mainboard('mb-b550i', 'ASUS ROG STRIX B550-I GAMING', 'ASUS', 4_490_000, {
    socket: 'AM4',
    chipset: 'B550',
    formFactor: 'ITX',
    memoryType: 'DDR4',
    memorySlots: 2,
    maxMemoryGB: 64,
    m2Slots: 2,
    wifi: true,
    color: 'black',
  }),
  mainboard('mb-b650m-white', 'ASRock B650M Pro RS WiFi White', 'ASRock', 4_290_000, {
    socket: 'AM5',
    chipset: 'B650',
    formFactor: 'mATX',
    memoryType: 'DDR5',
    memorySlots: 4,
    maxMemoryGB: 192,
    m2Slots: 2,
    wifi: true,
    color: 'white',
  }),
  mainboard('mb-x670e', 'GIGABYTE X670E AORUS MASTER', 'GIGABYTE', 8_990_000, {
    socket: 'AM5',
    chipset: 'X670E',
    formFactor: 'ATX',
    memoryType: 'DDR5',
    memorySlots: 4,
    maxMemoryGB: 192,
    m2Slots: 4,
    wifi: true,
    color: 'black',
  }),
  mainboard('mb-h610m', 'GIGABYTE H610M S2H DDR4', 'GIGABYTE', 1_790_000, {
    socket: 'LGA1700',
    chipset: 'H610',
    formFactor: 'mATX',
    memoryType: 'DDR4',
    memorySlots: 2,
    maxMemoryGB: 64,
    m2Slots: 1,
    wifi: false,
    color: 'black',
  }),
  mainboard('mb-b760m-white', 'MSI MAG B760M MORTAR WIFI White', 'MSI', 3_990_000, {
    socket: 'LGA1700',
    chipset: 'B760',
    formFactor: 'mATX',
    memoryType: 'DDR5',
    memorySlots: 4,
    maxMemoryGB: 192,
    m2Slots: 2,
    wifi: true,
    color: 'white',
  }),
  mainboard('mb-z790', 'ASUS ROG STRIX Z790-E GAMING WIFI', 'ASUS', 7_490_000, {
    socket: 'LGA1700',
    chipset: 'Z790',
    formFactor: 'ATX',
    memoryType: 'DDR5',
    memorySlots: 4,
    maxMemoryGB: 192,
    m2Slots: 5,
    wifi: true,
    color: 'black',
  }),
];

export const RAMS: EngineProduct[] = [
  ram('ram-ddr4-16', 'Kingston FURY Beast 16GB (2x8GB) DDR4 3200', 'Kingston', 990_000, {
    type: 'DDR4',
    capacityGB: 16,
    modules: 2,
    speedMHz: 3200,
    casLatency: 16,
    rgb: false,
    color: 'black',
  }),
  ram('ram-ddr4-32', 'Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600', 'Corsair', 1_890_000, {
    type: 'DDR4',
    capacityGB: 32,
    modules: 2,
    speedMHz: 3600,
    casLatency: 18,
    rgb: false,
    color: 'black',
  }),
  ram('ram-ddr5-16', 'Kingston FURY Beast 16GB (2x8GB) DDR5 5200', 'Kingston', 1_390_000, {
    type: 'DDR5',
    capacityGB: 16,
    modules: 2,
    speedMHz: 5200,
    casLatency: 40,
    rgb: false,
    color: 'black',
  }),
  ram('ram-ddr5-32', 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000', 'G.Skill', 2_890_000, {
    type: 'DDR5',
    capacityGB: 32,
    modules: 2,
    speedMHz: 6000,
    casLatency: 30,
    rgb: true,
    color: 'black',
  }),
  ram('ram-ddr5-32-white', 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000 White', 'Corsair', 2_990_000, {
    type: 'DDR5',
    capacityGB: 32,
    modules: 2,
    speedMHz: 6000,
    casLatency: 36,
    rgb: true,
    color: 'white',
  }),
  ram('ram-ddr5-64-4x', 'Kingston FURY Beast 64GB (4x16GB) DDR5 5600', 'Kingston', 5_490_000, {
    type: 'DDR5',
    capacityGB: 64,
    modules: 4,
    speedMHz: 5600,
    casLatency: 36,
    rgb: false,
    color: 'black',
  }),
];

export const GPUS: EngineProduct[] = [
  gpu(
    'gpu-3050',
    'GIGABYTE GeForce RTX 3050 WINDFORCE OC 6G',
    'GIGABYTE',
    4_190_000,
    {
      chipset: 'RTX 3050 6GB',
      chipsetBrand: 'NVIDIA',
      vramGB: 6,
      lengthMm: 190,
      tgpW: 70,
      recommendedPsuW: 300,
      color: 'black',
    },
    { gpuScore: 4900 },
  ),
  gpu(
    'gpu-4060',
    'ASUS Dual GeForce RTX 4060 OC 8GB',
    'ASUS',
    7_990_000,
    {
      chipset: 'RTX 4060',
      chipsetBrand: 'NVIDIA',
      vramGB: 8,
      lengthMm: 227,
      tgpW: 115,
      recommendedPsuW: 550,
      color: 'black',
    },
    { gpuScore: 10600 },
  ),
  gpu(
    'gpu-rx7600',
    'Sapphire PULSE Radeon RX 7600 8GB',
    'Sapphire',
    6_990_000,
    {
      chipset: 'RX 7600',
      chipsetBrand: 'AMD',
      vramGB: 8,
      lengthMm: 250,
      tgpW: 165,
      recommendedPsuW: 550,
      color: 'black',
    },
    { gpuScore: 10800 },
  ),
  gpu(
    'gpu-4060ti-16',
    'MSI GeForce RTX 4060 Ti VENTUS 2X 16G',
    'MSI',
    12_490_000,
    {
      chipset: 'RTX 4060 Ti 16GB',
      chipsetBrand: 'NVIDIA',
      vramGB: 16,
      lengthMm: 245,
      tgpW: 165,
      recommendedPsuW: 550,
      color: 'black',
    },
    { gpuScore: 13500 },
  ),
  gpu(
    'gpu-3070ti',
    'ZOTAC GAMING GeForce RTX 3070 Ti Trinity 8GB',
    'ZOTAC',
    11_990_000,
    {
      chipset: 'RTX 3070 Ti',
      chipsetBrand: 'NVIDIA',
      vramGB: 8,
      lengthMm: 285,
      tgpW: 290,
      recommendedPsuW: 750,
      color: 'black',
    },
    { gpuScore: 14200 },
  ),
  gpu(
    'gpu-4070',
    'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G',
    'GIGABYTE',
    15_490_000,
    {
      chipset: 'RTX 4070',
      chipsetBrand: 'NVIDIA',
      vramGB: 12,
      lengthMm: 261,
      tgpW: 200,
      recommendedPsuW: 650,
      color: 'black',
    },
    { gpuScore: 17800 },
  ),
  gpu(
    'gpu-4070s-oos',
    'ASUS TUF GeForce RTX 4070 SUPER 12GB',
    'ASUS',
    17_990_000,
    {
      chipset: 'RTX 4070 SUPER',
      chipsetBrand: 'NVIDIA',
      vramGB: 12,
      lengthMm: 305,
      tgpW: 220,
      recommendedPsuW: 750,
      color: 'black',
    },
    { gpuScore: 20500 },
    0,
  ),
];

export const STORAGES: EngineProduct[] = [
  storage('ssd-sata-500', 'Samsung 870 EVO 500GB SATA', 'Samsung', 1_290_000, {
    interface: 'SATA',
    formFactor: '2.5"',
    capacityGB: 500,
    readMBps: 560,
    writeMBps: 530,
  }),
  storage('ssd-nvme-500', 'Kingston NV2 500GB NVMe', 'Kingston', 890_000, {
    interface: 'NVMe',
    formFactor: 'M.2',
    capacityGB: 500,
    readMBps: 3500,
    writeMBps: 2100,
  }),
  storage('ssd-nvme-1tb', 'WD Black SN770 1TB NVMe', 'Western Digital', 1_690_000, {
    interface: 'NVMe',
    formFactor: 'M.2',
    capacityGB: 1000,
    readMBps: 5150,
    writeMBps: 4900,
  }),
  storage('ssd-nvme-2tb', 'Samsung 990 PRO 2TB NVMe', 'Samsung', 4_290_000, {
    interface: 'NVMe',
    formFactor: 'M.2',
    capacityGB: 2000,
    readMBps: 7450,
    writeMBps: 6900,
  }),
];

export const PSUS: EngineProduct[] = [
  psu('psu-450-bronze', 'Cooler Master MWE 450 Bronze V2', 'Cooler Master', 990_000, {
    wattage: 450,
    efficiency: '80 Plus Bronze',
    formFactor: 'ATX',
    modular: false,
    color: 'black',
  }),
  psu('psu-550-bronze', 'Corsair CX550 80 Plus Bronze', 'Corsair', 1_290_000, {
    wattage: 550,
    efficiency: '80 Plus Bronze',
    formFactor: 'ATX',
    modular: false,
    color: 'black',
  }),
  psu('psu-650-gold', 'MSI MAG A650GL 80 Plus Gold', 'MSI', 1_990_000, {
    wattage: 650,
    efficiency: '80 Plus Gold',
    formFactor: 'ATX',
    modular: true,
    color: 'black',
  }),
  psu('psu-750-gold', 'Corsair RM750e 80 Plus Gold', 'Corsair', 2_490_000, {
    wattage: 750,
    efficiency: '80 Plus Gold',
    formFactor: 'ATX',
    modular: true,
    color: 'black',
  }),
  psu('psu-sfx-600', 'Corsair SF600 80 Plus Gold SFX', 'Corsair', 2_890_000, {
    wattage: 600,
    efficiency: '80 Plus Gold',
    formFactor: 'SFX',
    modular: true,
    color: 'black',
  }),
];

export const CASES: EngineProduct[] = [
  pcCase('case-atx-black', 'NZXT H5 Flow Black', 'NZXT', 1_990_000, {
    supportedFormFactors: ['ATX', 'mATX', 'ITX'],
    maxGpuLengthMm: 365,
    maxCoolerHeightMm: 165,
    radiatorSupportMm: [240, 280],
    psuFormFactors: ['ATX'],
    color: 'black',
  }),
  pcCase('case-matx-white', 'Xigmatek Gaming Z mATX White', 'Xigmatek', 1_190_000, {
    supportedFormFactors: ['mATX', 'ITX'],
    maxGpuLengthMm: 330,
    maxCoolerHeightMm: 160,
    radiatorSupportMm: [240],
    psuFormFactors: ['ATX'],
    color: 'white',
  }),
  pcCase('case-itx-sfx', 'Jonsbo A4 ITX SFX', 'Jonsbo', 2_290_000, {
    supportedFormFactors: ['ITX'],
    maxGpuLengthMm: 250,
    maxCoolerHeightMm: 70,
    radiatorSupportMm: [],
    psuFormFactors: ['SFX'],
    color: 'black',
  }),
  pcCase('case-o11-white', 'Lian Li O11 Dynamic EVO White', 'Lian Li', 3_790_000, {
    supportedFormFactors: ['ATX', 'mATX', 'ITX'],
    maxGpuLengthMm: 420,
    maxCoolerHeightMm: 167,
    radiatorSupportMm: [240, 280, 360],
    psuFormFactors: ['ATX', 'SFX'],
    color: 'white',
  }),
];

export const COOLERS: EngineProduct[] = [
  cooler('cooler-lowprofile', 'ID-COOLING IS-40X V3 Low Profile', 'ID-COOLING', 590_000, {
    type: 'air',
    sockets: ['AM4', 'LGA1700'],
    heightMm: 45,
    tdpRatingW: 95,
    rgb: false,
    color: 'black',
  }),
  cooler('cooler-ak400', 'DeepCool AK400', 'DeepCool', 690_000, {
    type: 'air',
    sockets: ['AM4', 'AM5', 'LGA1700'],
    heightMm: 155,
    tdpRatingW: 220,
    rgb: false,
    color: 'black',
  }),
  cooler('cooler-pa120-white', 'Thermalright Peerless Assassin 120 SE White', 'Thermalright', 990_000, {
    type: 'air',
    sockets: ['AM4', 'AM5', 'LGA1700'],
    heightMm: 157,
    tdpRatingW: 245,
    rgb: false,
    color: 'white',
  }),
  cooler('cooler-aio-240', 'DeepCool LE520 240mm', 'DeepCool', 1_690_000, {
    type: 'aio',
    sockets: ['AM4', 'AM5', 'LGA1700'],
    radiatorMm: 240,
    tdpRatingW: 250,
    rgb: true,
    color: 'black',
  }),
  cooler('cooler-aio-360-white', 'NZXT Kraken 360 RGB White', 'NZXT', 3_290_000, {
    type: 'aio',
    sockets: ['AM4', 'AM5', 'LGA1700'],
    radiatorMm: 360,
    tdpRatingW: 300,
    rgb: true,
    color: 'white',
  }),
];

export const CATALOG: EngineProduct[] = [
  ...CPUS,
  ...MAINBOARDS,
  ...RAMS,
  ...GPUS,
  ...STORAGES,
  ...PSUS,
  ...CASES,
  ...COOLERS,
];

const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));

export function byId(id: string): EngineProduct {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`fixture product not found: ${id}`);
  return p;
}

/** Shallow-clones a fixture product with spec / field overrides, for boundary tests. */
export function variant(
  id: string,
  specs: Record<string, unknown>,
  fields: Partial<EngineProduct> = {},
): EngineProduct {
  const base = byId(id);
  return { ...base, ...fields, specs: { ...base.specs, ...specs } as EngineProduct['specs'] };
}
