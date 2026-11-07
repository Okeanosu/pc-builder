import { describe, expect, it } from 'vitest';
import { byId, CATALOG, variant } from '../test/fixtures/catalog';
import { checkCompatibility } from './compatibility';
import { minPsuWattage, RULES, recommendedPsuWattage } from './rules';
import type { CompatibilityContext, PartMap, RuleCode } from './types';

const issues = (parts: PartMap, ctx?: CompatibilityContext) => checkCompatibility(parts, ctx).issues;
const has = (
  parts: PartMap,
  code: RuleCode,
  severity: 'error' | 'warning' = 'error',
  ctx?: CompatibilityContext,
) => issues(parts, ctx).some((i) => i.code === code && i.severity === severity);
const hasCode = (parts: PartMap, code: RuleCode, ctx?: CompatibilityContext) =>
  issues(parts, ctx).some((i) => i.code === code);

const VALID_AM5: PartMap = {
  cpu: byId('cpu-r5-7600'),
  mainboard: byId('mb-b650m-white'),
  ram: byId('ram-ddr5-32'),
  gpu: byId('gpu-4060'),
  storage: byId('ssd-nvme-1tb'),
  psu: byId('psu-650-gold'),
  case: byId('case-matx-white'),
  cooler: byId('cooler-ak400'),
};

describe('checkCompatibility — full builds', () => {
  it('reports no issue for a valid AM5 build', () => {
    expect(issues(VALID_AM5)).toEqual([]);
  });

  it('reports no issue for an empty part map and still estimates the base wattage', () => {
    const report = checkCompatibility({});
    expect(report.issues).toEqual([]);
    expect(report.estimatedWattage).toBe(75);
    expect(report.recommendedPsuWattage).toBe(100);
  });

  it('every issue carries Vietnamese text and the categories involved', () => {
    const report = checkCompatibility({ ...VALID_AM5, mainboard: byId('mb-z790') });
    const c01 = report.issues.find((i) => i.code === 'C01');
    expect(c01).toEqual({
      code: 'C01',
      severity: 'error',
      message: 'Socket CPU (AM5) không khớp mainboard (LGA1700)',
      categories: ['cpu', 'mainboard'],
    });
  });

  it('exposes one rule function per code C01..C14', () => {
    expect(Object.keys(RULES).sort()).toEqual(
      [
        'C01',
        'C02',
        'C03',
        'C04',
        'C05',
        'C06',
        'C07',
        'C08',
        'C09',
        'C10',
        'C11',
        'C12',
        'C13',
        'C14',
      ].sort(),
    );
  });
});

describe('C01 cpu socket = mainboard socket', () => {
  it('passes when sockets match', () => {
    expect(hasCode({ cpu: byId('cpu-i5-13400f'), mainboard: byId('mb-h610m') }, 'C01')).toBe(false);
  });
  it('fails AM5 cpu on LGA1700 board', () => {
    expect(has({ cpu: byId('cpu-r5-7600'), mainboard: byId('mb-z790') }, 'C01')).toBe(true);
  });
  it('boundary: adjacent AMD generations (AM4 cpu on AM5 board) still fail', () => {
    expect(has({ cpu: byId('cpu-r5-5600'), mainboard: byId('mb-b650m-white') }, 'C01')).toBe(true);
  });
  it('is not evaluated when one side is missing', () => {
    expect(hasCode({ cpu: byId('cpu-r5-7600') }, 'C01')).toBe(false);
  });
});

describe('C02 memory type', () => {
  it('passes DDR5 kit on DDR5 board', () => {
    expect(hasCode({ mainboard: byId('mb-b650m-white'), ram: byId('ram-ddr5-16') }, 'C02')).toBe(false);
  });
  it('fails DDR4 kit on DDR5 board', () => {
    const list = issues({ mainboard: byId('mb-b650m-white'), ram: byId('ram-ddr4-16') });
    expect(list).toContainEqual(
      expect.objectContaining({ code: 'C02', severity: 'error', categories: ['mainboard', 'ram'] }),
    );
  });
  it('boundary: LGA1700 cpu supports both DDR4 and DDR5', () => {
    const parts = { cpu: byId('cpu-i5-12400'), mainboard: byId('mb-h610m'), ram: byId('ram-ddr4-16') };
    expect(hasCode(parts, 'C02')).toBe(false);
  });
  it('fails when the cpu memory controller does not support the kit', () => {
    const list = issues({ cpu: byId('cpu-r5-7600'), ram: byId('ram-ddr4-16') });
    expect(list).toContainEqual(expect.objectContaining({ code: 'C02', categories: ['cpu', 'ram'] }));
  });
});

describe('C03 memory slots and capacity', () => {
  const twoSlotDdr5 = variant('mb-b760m-white', { memorySlots: 2, maxMemoryGB: 64 });
  it('passes 2 modules on a 4-slot board', () => {
    expect(hasCode({ mainboard: byId('mb-b760m-white'), ram: byId('ram-ddr5-32') }, 'C03')).toBe(false);
  });
  it('boundary: modules = slots and capacity = max pass', () => {
    const exactKit = variant('ram-ddr5-32', { capacityGB: 64 });
    expect(hasCode({ mainboard: twoSlotDdr5, ram: exactKit }, 'C03')).toBe(false);
  });
  it('fails 4 modules on a 2-slot board', () => {
    expect(has({ mainboard: twoSlotDdr5, ram: byId('ram-ddr5-64-4x') }, 'C03')).toBe(true);
  });
  it('fails capacity one step over the board maximum', () => {
    const overKit = variant('ram-ddr5-32', { capacityGB: 65 });
    const list = issues({ mainboard: twoSlotDdr5, ram: overKit }).filter((i) => i.code === 'C03');
    expect(list).toHaveLength(1);
    expect(list[0]?.message).toContain('64GB');
  });
});

describe('C04 board form factor fits case', () => {
  it('passes mATX board in mATX case', () => {
    expect(hasCode({ mainboard: byId('mb-b650m-white'), case: byId('case-matx-white') }, 'C04')).toBe(false);
  });
  it('fails ATX board in mATX case', () => {
    expect(has({ mainboard: byId('mb-x670e'), case: byId('case-matx-white') }, 'C04')).toBe(true);
  });
  it('boundary: ITX board in ITX-only case passes', () => {
    expect(hasCode({ mainboard: byId('mb-b550i'), case: byId('case-itx-sfx') }, 'C04')).toBe(false);
  });
});

describe('C05 gpu length', () => {
  it('passes a short card in a large case', () => {
    expect(hasCode({ gpu: byId('gpu-4060'), case: byId('case-atx-black') }, 'C05')).toBe(false);
  });
  it('boundary: lengthMm === maxGpuLengthMm passes', () => {
    expect(hasCode({ gpu: byId('gpu-rx7600'), case: byId('case-itx-sfx') }, 'C05')).toBe(false);
  });
  it('fails one millimetre over the limit', () => {
    const longer = variant('gpu-rx7600', { lengthMm: 251 });
    expect(has({ gpu: longer, case: byId('case-itx-sfx') }, 'C05')).toBe(true);
  });
});

describe('C06 cooler clearance', () => {
  it('passes a tower cooler under the height limit', () => {
    expect(hasCode({ cooler: byId('cooler-ak400'), case: byId('case-atx-black') }, 'C06')).toBe(false);
  });
  it('boundary: heightMm === maxCoolerHeightMm passes, +1 fails', () => {
    const exact = variant('cooler-ak400', { heightMm: 160 });
    const over = variant('cooler-ak400', { heightMm: 161 });
    expect(hasCode({ cooler: exact, case: byId('case-matx-white') }, 'C06')).toBe(false);
    expect(has({ cooler: over, case: byId('case-matx-white') }, 'C06')).toBe(true);
  });
  it('passes an AIO whose radiator size the case supports', () => {
    expect(hasCode({ cooler: byId('cooler-aio-240'), case: byId('case-matx-white') }, 'C06')).toBe(false);
  });
  it('fails an AIO radiator the case does not support', () => {
    expect(has({ cooler: byId('cooler-aio-360-white'), case: byId('case-matx-white') }, 'C06')).toBe(true);
    expect(has({ cooler: byId('cooler-aio-240'), case: byId('case-itx-sfx') }, 'C06')).toBe(true);
  });
  it('skips the check when the cooler has no size data', () => {
    const noHeight = variant('cooler-ak400', { heightMm: undefined });
    const noRadiator = variant('cooler-aio-240', { radiatorMm: undefined });
    expect(hasCode({ cooler: noHeight, case: byId('case-itx-sfx') }, 'C06')).toBe(false);
    expect(hasCode({ cooler: noRadiator, case: byId('case-itx-sfx') }, 'C06')).toBe(false);
  });
});

describe('C07 cooler socket support', () => {
  it('passes a cooler listing the cpu socket', () => {
    expect(hasCode({ cpu: byId('cpu-r5-7600'), cooler: byId('cooler-ak400') }, 'C07')).toBe(false);
  });
  it('fails a cooler without AM5 support', () => {
    const list = issues({ cpu: byId('cpu-r5-7600'), cooler: byId('cooler-lowprofile') });
    expect(list).toContainEqual(
      expect.objectContaining({ code: 'C07', message: 'Tản nhiệt không hỗ trợ socket AM5' }),
    );
  });
  it('boundary: a cooler listing exactly one matching socket passes', () => {
    const am5Only = variant('cooler-ak400', { sockets: ['AM5'] });
    expect(hasCode({ cpu: byId('cpu-r5-7600'), cooler: am5Only }, 'C07')).toBe(false);
  });
});

describe('C08 power supply wattage', () => {
  // 125 W cpu + 200 W gpu + 75 W base = 400 W → minimum 520 W, headroom 600 W
  const heavy: PartMap = { cpu: byId('cpu-i7-14700k'), gpu: byId('gpu-4070') };
  const withPsu = (wattage: number) => ({ ...heavy, psu: variant('psu-650-gold', { wattage }) });

  it('computes estimated and recommended wattage', () => {
    const report = checkCompatibility(heavy);
    expect(report.estimatedWattage).toBe(400);
    expect(report.recommendedPsuWattage).toBe(550);
    expect(minPsuWattage(400)).toBe(520);
    expect(recommendedPsuWattage(255)).toBe(350);
  });
  it('boundary: exactly ceil(est × 1.3) passes the hard check but warns', () => {
    expect(has(withPsu(520), 'C08', 'error')).toBe(false);
    expect(has(withPsu(520), 'C08', 'warning')).toBe(true);
  });
  it('fails one watt below the minimum', () => {
    const list = issues(withPsu(519)).filter((i) => i.code === 'C08');
    expect(list).toEqual([
      {
        code: 'C08',
        severity: 'error',
        message: 'Nguồn 519W không đủ công suất, cần tối thiểu 520W',
        categories: ['psu', 'cpu', 'gpu'],
      },
    ]);
  });
  it('boundary: exactly est × 1.5 has no warning, one watt less warns', () => {
    expect(hasCode(withPsu(600), 'C08')).toBe(false);
    expect(has(withPsu(599), 'C08', 'warning')).toBe(true);
  });
  it('uses ceil without floating-point drift for fractional products', () => {
    // 65 + 115 + 75 = 255 → 331.5 → 332
    const parts = { cpu: byId('cpu-r5-7600'), gpu: byId('gpu-4060') };
    expect(has({ ...parts, psu: variant('psu-450-bronze', { wattage: 332 }) }, 'C08', 'error')).toBe(false);
    expect(has({ ...parts, psu: variant('psu-450-bronze', { wattage: 331 }) }, 'C08', 'error')).toBe(true);
  });
  it('counts no gpu power for an iGPU build', () => {
    const report = checkCompatibility({ cpu: byId('cpu-r5-5600g'), psu: byId('psu-450-bronze') });
    expect(report.estimatedWattage).toBe(140);
    expect(report.issues.filter((i) => i.code === 'C08')).toEqual([]);
  });
});

describe('C09 cooler tdp rating (soft)', () => {
  it('passes a cooler rated above the cpu tdp', () => {
    expect(hasCode({ cpu: byId('cpu-r7-7800x3d'), cooler: byId('cooler-ak400') }, 'C09')).toBe(false);
  });
  it('boundary: rating === tdp passes', () => {
    const exact = variant('cooler-ak400', { tdpRatingW: 120 });
    expect(hasCode({ cpu: byId('cpu-r7-7800x3d'), cooler: exact }, 'C09')).toBe(false);
  });
  it('warns (not errors) when the cooler is under-rated', () => {
    const parts = { cpu: byId('cpu-i7-14700k'), cooler: byId('cooler-lowprofile') };
    expect(has(parts, 'C09', 'warning')).toBe(true);
    expect(has(parts, 'C09', 'error')).toBe(false);
  });
});

describe('C10 integrated graphics when no discrete gpu', () => {
  const officeNoGpu = (cpuId: string): PartMap => ({
    cpu: byId(cpuId),
    mainboard: byId('mb-b450m'),
    ram: byId('ram-ddr4-16'),
    storage: byId('ssd-nvme-500'),
    psu: byId('psu-450-bronze'),
    case: byId('case-matx-white'),
    cooler: byId('cooler-ak400'),
  });
  it('fails an office build without gpu whose cpu has integratedGraphics: false', () => {
    expect(issues(officeNoGpu('cpu-r5-5600'))).toEqual([
      {
        code: 'C10',
        severity: 'error',
        message: 'CPU không có đồ họa tích hợp, cần thêm card đồ họa rời',
        categories: ['cpu', 'gpu'],
      },
    ]);
  });
  it('passes the same build with an iGPU cpu', () => {
    expect(issues(officeNoGpu('cpu-r5-5600g'))).toEqual([]);
  });
  it('boundary: a non-iGPU cpu is fine once a discrete gpu is present', () => {
    expect(hasCode({ ...officeNoGpu('cpu-r5-5600'), gpu: byId('gpu-3050') }, 'C10')).toBe(false);
  });
});

describe('C11 NVMe needs an M.2 slot', () => {
  const noM2 = variant('mb-b450m', { m2Slots: 0 });
  it('boundary: one M.2 slot is enough', () => {
    expect(hasCode({ mainboard: byId('mb-b450m'), storage: byId('ssd-nvme-1tb') }, 'C11')).toBe(false);
  });
  it('fails NVMe on a board without M.2 slots', () => {
    expect(has({ mainboard: noM2, storage: byId('ssd-nvme-1tb') }, 'C11')).toBe(true);
  });
  it('passes a SATA 2.5" drive on a board without M.2 slots', () => {
    expect(hasCode({ mainboard: noM2, storage: byId('ssd-sata-500') }, 'C11')).toBe(false);
  });
});

describe('C12 psu form factor fits case', () => {
  it('passes ATX psu in ATX case', () => {
    expect(hasCode({ psu: byId('psu-650-gold'), case: byId('case-atx-black') }, 'C12')).toBe(false);
  });
  it('fails ATX psu in SFX-only case and SFX psu in ATX-only case', () => {
    expect(has({ psu: byId('psu-650-gold'), case: byId('case-itx-sfx') }, 'C12')).toBe(true);
    expect(has({ psu: byId('psu-sfx-600'), case: byId('case-atx-black') }, 'C12')).toBe(true);
  });
  it('boundary: a case listing both form factors accepts SFX', () => {
    expect(hasCode({ psu: byId('psu-sfx-600'), case: byId('case-o11-white') }, 'C12')).toBe(false);
  });
});

describe('C13 cpu–gpu balance (gaming, soft)', () => {
  const gaming: CompatibilityContext = { purpose: 'gaming', catalog: CATALOG };
  it('boundary: a tier gap of exactly 2 passes', () => {
    expect(hasCode({ cpu: byId('cpu-i3-12100f'), gpu: byId('gpu-4060ti-16') }, 'C13', gaming)).toBe(false);
  });
  it('warns when the tier gap exceeds 2', () => {
    const parts = { cpu: byId('cpu-i3-12100f'), gpu: byId('gpu-4070') };
    expect(has(parts, 'C13', 'warning', gaming)).toBe(true);
  });
  it('is only evaluated for gaming with a reference catalog', () => {
    const parts = { cpu: byId('cpu-i3-12100f'), gpu: byId('gpu-4070') };
    expect(hasCode(parts, 'C13', { purpose: 'graphics', catalog: CATALOG })).toBe(false);
    expect(hasCode(parts, 'C13', { purpose: 'gaming' })).toBe(false);
  });
});

describe('C14 budget', () => {
  const pricey = (price: number): PartMap => ({ cpu: variant('cpu-r5-7600', {}, { price }) });
  it('boundary: total === budget passes', () => {
    expect(hasCode(pricey(25_000_000), 'C14', { budget: 25_000_000 })).toBe(false);
  });
  it('fails one dong over budget', () => {
    const list = issues(pricey(25_000_001), { budget: 25_000_000 });
    expect(list).toContainEqual(
      expect.objectContaining({
        code: 'C14',
        severity: 'error',
        message: expect.stringContaining('25.000.000₫'),
      }),
    );
  });
  it('boundary: exactly 85% of budget has no warning, below warns', () => {
    expect(hasCode(pricey(85_000_000), 'C14', { budget: 100_000_000 })).toBe(false);
    expect(has(pricey(84_999_999), 'C14', 'warning', { budget: 100_000_000 })).toBe(true);
  });
  it('is skipped without a budget or without parts', () => {
    expect(hasCode(pricey(1), 'C14')).toBe(false);
    expect(hasCode({}, 'C14', { budget: 1_000_000 })).toBe(false);
  });
});
