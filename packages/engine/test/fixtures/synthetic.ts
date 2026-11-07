import type {
  CaseSpecs,
  CategoryKey,
  Color,
  CoolerSpecs,
  CpuSpecs,
  FormFactor,
  GpuSpecs,
  MainboardSpecs,
  MemoryType,
  PsuFormFactor,
  PsuSpecs,
  RamSpecs,
  Socket,
  StorageSpecs,
} from '@pc/shared';
import type { EngineProduct } from '../../src/types';

/** Deterministic 32-bit PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Category mix of the seed catalog (cpu 30, mainboard 35, ram 25, gpu 30, storage 25, psu 25, case 25, cooler 25). */
const MIX: Record<CategoryKey, number> = {
  cpu: 30,
  mainboard: 35,
  ram: 25,
  gpu: 30,
  storage: 25,
  psu: 25,
  case: 25,
  cooler: 25,
};
const MIX_TOTAL = Object.values(MIX).reduce((a, b) => a + b, 0);

export function syntheticCatalog(size: number, seed = 2026): EngineProduct[] {
  const rnd = mulberry32(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
  const vnd = (x: number) => Math.max(10_000, Math.round(x / 10_000) * 10_000);
  const color = (): Color => (rnd() < 0.3 ? 'white' : 'black');
  const stock = () => (rnd() < 0.1 ? 0 : int(1, 30));

  const out: EngineProduct[] = [];
  const push = (
    category: CategoryKey,
    n: number,
    name: string,
    brand: string,
    price: number,
    specs: unknown,
    extra = {},
  ) =>
    out.push({
      id: `${category}-${String(n).padStart(3, '0')}`,
      category,
      name,
      brand,
      price: vnd(price),
      stock: stock(),
      specs: specs as EngineProduct['specs'],
      ...extra,
    });

  const counts = Object.fromEntries(
    Object.entries(MIX).map(([c, w]) => [c, Math.max(2, Math.round((size * w) / MIX_TOTAL))]),
  ) as Record<CategoryKey, number>;

  for (let n = 0; n < counts.cpu; n++) {
    const amd = rnd() < 0.5;
    const socket: Socket = amd ? (rnd() < 0.3 ? 'AM4' : 'AM5') : rnd() < 0.75 ? 'LGA1700' : 'LGA1851';
    const tier = rnd();
    const cores = [4, 6, 8, 12, 16, 20, 24][Math.min(6, Math.floor(tier * 7))] as number;
    const single = Math.round(1300 + tier * 1000 + between(-80, 80));
    const multi = Math.round(cores * single * between(0.85, 1.05));
    const memoryTypes: MemoryType[] =
      socket === 'AM4' ? ['DDR4'] : socket === 'LGA1700' ? ['DDR4', 'DDR5'] : ['DDR5'];
    const specs: CpuSpecs = {
      socket,
      cores,
      threads: cores * 2,
      baseClockGHz: Math.round(between(2.5, 4.2) * 10) / 10,
      boostClockGHz: Math.round(between(4.2, 5.8) * 10) / 10,
      tdpW: Math.round(45 + tier * 120),
      integratedGraphics: socket === 'AM5' ? rnd() < 0.85 : rnd() < 0.45,
      memoryTypes,
    };
    push(
      'cpu',
      n,
      `CPU ${socket} ${cores}C #${n}`,
      amd ? 'AMD' : 'Intel',
      2_000_000 + tier ** 1.6 * 14_000_000,
      specs,
      {
        benchmark: { cpuSingle: single, cpuMulti: multi },
      },
    );
  }

  for (let n = 0; n < counts.mainboard; n++) {
    const socket = pick<Socket>(['AM4', 'AM5', 'AM5', 'LGA1700', 'LGA1700', 'LGA1851']);
    const formFactor = pick<FormFactor>(['ATX', 'ATX', 'mATX', 'mATX', 'mATX', 'ITX']);
    const memoryType: MemoryType =
      socket === 'AM4' ? 'DDR4' : socket === 'LGA1700' ? (rnd() < 0.5 ? 'DDR4' : 'DDR5') : 'DDR5';
    const high = rnd();
    const chipset = high > 0.75 ? (socket.startsWith('AM') ? 'X670' : 'Z790') : high > 0.25 ? 'B650' : 'A620';
    const slots = formFactor === 'ITX' ? 2 : rnd() < 0.3 ? 2 : 4;
    const specs: MainboardSpecs = {
      socket,
      chipset,
      formFactor,
      memoryType,
      memorySlots: slots,
      maxMemoryGB: slots === 2 ? 64 : pick([128, 192]),
      m2Slots: rnd() < 0.08 ? 0 : int(1, 4),
      wifi: rnd() < 0.55,
      color: color(),
    };
    push(
      'mainboard',
      n,
      `Mainboard ${socket} ${formFactor} #${n}`,
      pick(['ASUS', 'MSI', 'GIGABYTE', 'ASRock']),
      1_500_000 + high * 8_000_000,
      specs,
    );
  }

  for (let n = 0; n < counts.ram; n++) {
    const type: MemoryType = rnd() < 0.4 ? 'DDR4' : 'DDR5';
    const capacityGB = pick([8, 16, 16, 32, 32, 64]);
    const modules = capacityGB === 8 ? 1 : rnd() < 0.15 ? 4 : 2;
    const speedMHz = type === 'DDR4' ? pick([2666, 3200, 3600]) : pick([4800, 5200, 5600, 6000, 6400]);
    const specs: RamSpecs = {
      type,
      capacityGB,
      modules,
      speedMHz,
      casLatency: type === 'DDR4' ? 16 : 36,
      rgb: rnd() < 0.4,
      color: color(),
    };
    push(
      'ram',
      n,
      `RAM ${type} ${capacityGB}GB #${n}`,
      pick(['Kingston', 'Corsair', 'G.Skill', 'TeamGroup']),
      capacityGB * 70_000 + speedMHz * 120,
      specs,
    );
  }

  for (let n = 0; n < counts.gpu; n++) {
    const tier = rnd();
    const specs: GpuSpecs = {
      chipset: `GPU T${Math.round(tier * 100)}`,
      chipsetBrand: pick(['NVIDIA', 'NVIDIA', 'AMD', 'Intel']),
      vramGB: pick([6, 8, 8, 12, 16, 16, 24].slice(0, 3 + Math.floor(tier * 4))),
      lengthMm: Math.round(170 + tier * 170 + between(-15, 15)),
      tgpW: Math.round(70 + tier * 330),
      recommendedPsuW: Math.round(400 + tier * 500),
      color: color(),
    };
    push(
      'gpu',
      n,
      `GPU ${specs.chipset} #${n}`,
      pick(['ASUS', 'MSI', 'GIGABYTE', 'ZOTAC', 'Sapphire']),
      3_500_000 + tier ** 1.8 * 40_000_000,
      specs,
      {
        benchmark: { gpuScore: Math.round(4000 + tier * 32_000 + between(-500, 500)) },
      },
    );
  }

  for (let n = 0; n < counts.storage; n++) {
    const nvme = rnd() < 0.75;
    const capacityGB = pick([250, 500, 1000, 1000, 2000, 4000]);
    const readMBps = nvme ? int(2000, 7400) : int(500, 560);
    const specs: StorageSpecs = {
      interface: nvme ? 'NVMe' : 'SATA',
      formFactor: nvme ? 'M.2' : '2.5"',
      capacityGB,
      readMBps,
      writeMBps: Math.round(readMBps * 0.9),
    };
    push(
      'storage',
      n,
      `SSD ${capacityGB}GB #${n}`,
      pick(['Samsung', 'WD', 'Kingston', 'Crucial']),
      400_000 + capacityGB * 1_100 + readMBps * 60,
      specs,
    );
  }

  for (let n = 0; n < counts.psu; n++) {
    const wattage = pick([450, 550, 650, 750, 850, 1000, 1200]);
    const formFactor: PsuFormFactor = rnd() < 0.15 ? 'SFX' : 'ATX';
    const efficiency = pick(['80 Plus White', '80 Plus Bronze', '80 Plus Gold', '80 Plus Platinum']);
    const specs: PsuSpecs = { wattage, efficiency, formFactor, modular: rnd() < 0.5, color: color() };
    push(
      'psu',
      n,
      `PSU ${wattage}W #${n}`,
      pick(['Corsair', 'Seasonic', 'MSI', 'Cooler Master']),
      600_000 + wattage * 2_200 + (formFactor === 'SFX' ? 900_000 : 0),
      specs,
    );
  }

  for (let n = 0; n < counts.case; n++) {
    const kind = pick(['ATX', 'ATX', 'mATX', 'ITX']);
    const supportedFormFactors: FormFactor[] =
      kind === 'ATX' ? ['ATX', 'mATX', 'ITX'] : kind === 'mATX' ? ['mATX', 'ITX'] : ['ITX'];
    const specs: CaseSpecs = {
      supportedFormFactors,
      maxGpuLengthMm: kind === 'ITX' ? int(200, 330) : int(300, 420),
      maxCoolerHeightMm: kind === 'ITX' ? int(55, 160) : int(150, 180),
      radiatorSupportMm: kind === 'ITX' ? pick([[], [240]]) : pick([[240], [240, 280], [240, 280, 360]]),
      psuFormFactors: kind === 'ITX' ? pick([['SFX'], ['ATX', 'SFX']]) : ['ATX'],
      color: color(),
    };
    push(
      'case',
      n,
      `Case ${kind} #${n}`,
      pick(['NZXT', 'Lian Li', 'Corsair', 'Xigmatek', 'Jonsbo']),
      700_000 + rnd() * 3_500_000,
      specs,
    );
  }

  for (let n = 0; n < counts.cooler; n++) {
    const aio = rnd() < 0.35;
    const tdpRatingW = aio ? int(200, 320) : int(65, 260);
    const specs: CoolerSpecs = aio
      ? {
          type: 'aio',
          sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
          radiatorMm: pick([240, 280, 360]),
          tdpRatingW,
          rgb: rnd() < 0.6,
          color: color(),
        }
      : {
          type: 'air',
          sockets: rnd() < 0.15 ? ['AM4', 'LGA1700'] : ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
          heightMm: tdpRatingW < 100 ? int(40, 70) : int(140, 170),
          tdpRatingW,
          rgb: rnd() < 0.3,
          color: color(),
        };
    push(
      'cooler',
      n,
      `Cooler ${specs.type} #${n}`,
      pick(['DeepCool', 'Noctua', 'Thermalright', 'NZXT']),
      300_000 + tdpRatingW * 6_000 + (aio ? 1_200_000 : 0),
      specs,
    );
  }

  return out;
}
