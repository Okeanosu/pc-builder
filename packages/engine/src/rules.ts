import { type CategoryKey, formatVnd, type SpecsByCategory, type StorageSpecs } from '@pc/shared';
import { cpuGpuTier } from './scoring';
import type { CompatibilityContext, CompatibilityIssue, EngineProduct, PartMap, RuleCode } from './types';

export const BASE_SYSTEM_WATTAGE = 75;
export const MIN_BUDGET_USE_PERCENT = 85;
export const MAX_TIER_GAP = 2;

export function specsOf<K extends CategoryKey>(p: EngineProduct, _category: K): SpecsByCategory[K] {
  return p.specs as SpecsByCategory[K];
}

export function estimateWattage(cpuTdpW: number, gpuTgpW: number): number {
  return cpuTdpW + gpuTgpW + BASE_SYSTEM_WATTAGE;
}

/** ceil(estimated × 1.3) in integer arithmetic (1.3 is not exact in binary floating point). */
export function minPsuWattage(estimated: number): number {
  return Math.ceil((estimated * 13) / 10);
}

export function recommendedPsuWattage(estimated: number): number {
  return Math.ceil((estimated * 13) / 500) * 50;
}

/** True when the PSU is below the comfortable ×1.5 headroom. */
export function lacksPsuHeadroom(wattage: number, estimated: number): boolean {
  return wattage * 2 < estimated * 3;
}

export function needsM2Slot(storage: StorageSpecs): boolean {
  return storage.interface === 'NVMe' || storage.formFactor === 'M.2';
}

const issue = (
  code: RuleCode,
  severity: CompatibilityIssue['severity'],
  message: string,
  categories: CategoryKey[],
): CompatibilityIssue => ({ code, severity, message, categories });

type Rule = (parts: PartMap, ctx: CompatibilityContext) => CompatibilityIssue[];

const c01: Rule = ({ cpu, mainboard }) => {
  if (!cpu || !mainboard) return [];
  const a = specsOf(cpu, 'cpu').socket;
  const b = specsOf(mainboard, 'mainboard').socket;
  return a === b
    ? []
    : [issue('C01', 'error', `Socket CPU (${a}) không khớp mainboard (${b})`, ['cpu', 'mainboard'])];
};

const c02: Rule = ({ cpu, mainboard, ram }) => {
  if (!ram) return [];
  const type = specsOf(ram, 'ram').type;
  const out: CompatibilityIssue[] = [];
  if (mainboard) {
    const boardType = specsOf(mainboard, 'mainboard').memoryType;
    if (boardType !== type) {
      out.push(
        issue('C02', 'error', `RAM ${type} không tương thích mainboard (hỗ trợ ${boardType})`, [
          'mainboard',
          'ram',
        ]),
      );
    }
  }
  if (cpu) {
    const supported = specsOf(cpu, 'cpu').memoryTypes;
    if (!supported.includes(type)) {
      out.push(
        issue('C02', 'error', `CPU không hỗ trợ RAM ${type} (hỗ trợ ${supported.join('/')})`, ['cpu', 'ram']),
      );
    }
  }
  return out;
};

const c03: Rule = ({ mainboard, ram }) => {
  if (!mainboard || !ram) return [];
  const board = specsOf(mainboard, 'mainboard');
  const kit = specsOf(ram, 'ram');
  const out: CompatibilityIssue[] = [];
  if (kit.modules > board.memorySlots) {
    out.push(
      issue('C03', 'error', `RAM gồm ${kit.modules} thanh nhưng mainboard chỉ có ${board.memorySlots} khe`, [
        'mainboard',
        'ram',
      ]),
    );
  }
  if (kit.capacityGB > board.maxMemoryGB) {
    out.push(
      issue(
        'C03',
        'error',
        `Dung lượng RAM ${kit.capacityGB}GB vượt mức tối đa mainboard hỗ trợ (${board.maxMemoryGB}GB)`,
        ['mainboard', 'ram'],
      ),
    );
  }
  return out;
};

const c04: Rule = ({ mainboard, case: pcCase }) => {
  if (!mainboard || !pcCase) return [];
  const ff = specsOf(mainboard, 'mainboard').formFactor;
  return specsOf(pcCase, 'case').supportedFormFactors.includes(ff)
    ? []
    : [issue('C04', 'error', `Vỏ case không hỗ trợ mainboard chuẩn ${ff}`, ['mainboard', 'case'])];
};

const c05: Rule = ({ gpu, case: pcCase }) => {
  if (!gpu || !pcCase) return [];
  const length = specsOf(gpu, 'gpu').lengthMm;
  const max = specsOf(pcCase, 'case').maxGpuLengthMm;
  return length <= max
    ? []
    : [
        issue('C05', 'error', `Card đồ họa dài ${length}mm vượt giới hạn vỏ case (${max}mm)`, [
          'gpu',
          'case',
        ]),
      ];
};

const c06: Rule = ({ cooler, case: pcCase }) => {
  if (!cooler || !pcCase) return [];
  const c = specsOf(cooler, 'cooler');
  const box = specsOf(pcCase, 'case');
  if (c.type === 'air') {
    if (c.heightMm === undefined || c.heightMm <= box.maxCoolerHeightMm) return [];
    return [
      issue(
        'C06',
        'error',
        `Tản nhiệt cao ${c.heightMm}mm vượt giới hạn vỏ case (${box.maxCoolerHeightMm}mm)`,
        ['cooler', 'case'],
      ),
    ];
  }
  if (c.radiatorMm === undefined || box.radiatorSupportMm.includes(c.radiatorMm)) return [];
  return [issue('C06', 'error', `Vỏ case không hỗ trợ radiator ${c.radiatorMm}mm`, ['cooler', 'case'])];
};

const c07: Rule = ({ cpu, cooler }) => {
  if (!cpu || !cooler) return [];
  const socket = specsOf(cpu, 'cpu').socket;
  return specsOf(cooler, 'cooler').sockets.includes(socket)
    ? []
    : [issue('C07', 'error', `Tản nhiệt không hỗ trợ socket ${socket}`, ['cpu', 'cooler'])];
};

const c08: Rule = ({ cpu, gpu, psu }) => {
  if (!psu) return [];
  const wattage = specsOf(psu, 'psu').wattage;
  const estimated = estimateWattage(cpu ? specsOf(cpu, 'cpu').tdpW : 0, gpu ? specsOf(gpu, 'gpu').tgpW : 0);
  const categories: CategoryKey[] = ['psu', 'cpu', 'gpu'];
  const minimum = minPsuWattage(estimated);
  if (wattage < minimum) {
    return [
      issue('C08', 'error', `Nguồn ${wattage}W không đủ công suất, cần tối thiểu ${minimum}W`, categories),
    ];
  }
  if (lacksPsuHeadroom(wattage, estimated)) {
    const comfortable = Math.ceil((estimated * 3) / 2);
    return [
      issue('C08', 'warning', `Nguồn ${wattage}W hơi sát tải, khuyến nghị từ ${comfortable}W`, categories),
    ];
  }
  return [];
};

const c09: Rule = ({ cpu, cooler }) => {
  if (!cpu || !cooler) return [];
  const tdp = specsOf(cpu, 'cpu').tdpW;
  const rating = specsOf(cooler, 'cooler').tdpRatingW;
  return rating >= tdp
    ? []
    : [
        issue('C09', 'warning', `Tản nhiệt (định mức ${rating}W) có thể không đủ cho CPU ${tdp}W`, [
          'cooler',
          'cpu',
        ]),
      ];
};

const c10: Rule = ({ cpu, gpu }) => {
  if (!cpu || gpu || specsOf(cpu, 'cpu').integratedGraphics) return [];
  return [issue('C10', 'error', 'CPU không có đồ họa tích hợp, cần thêm card đồ họa rời', ['cpu', 'gpu'])];
};

const c11: Rule = ({ mainboard, storage }) => {
  if (!mainboard || !storage) return [];
  const drive = specsOf(storage, 'storage');
  if (!needsM2Slot(drive) || specsOf(mainboard, 'mainboard').m2Slots >= 1) return [];
  return [
    issue('C11', 'error', `Ổ cứng ${drive.interface} M.2 cần khe M.2 nhưng mainboard không có`, [
      'storage',
      'mainboard',
    ]),
  ];
};

const c12: Rule = ({ psu, case: pcCase }) => {
  if (!psu || !pcCase) return [];
  const ff = specsOf(psu, 'psu').formFactor;
  return specsOf(pcCase, 'case').psuFormFactors.includes(ff)
    ? []
    : [issue('C12', 'error', `Vỏ case không hỗ trợ nguồn chuẩn ${ff}`, ['psu', 'case'])];
};

const c13: Rule = ({ cpu, gpu }, { purpose, catalog }) => {
  if (!cpu || !gpu || purpose !== 'gaming' || !catalog) return [];
  const cpuTier = cpuGpuTier(cpu, catalog);
  const gpuTier = cpuGpuTier(gpu, catalog);
  if (Math.abs(cpuTier - gpuTier) <= MAX_TIER_GAP) return [];
  return [
    issue('C13', 'warning', `Mất cân bằng CPU–GPU (cấp ${cpuTier} và ${gpuTier}), có thể gây nghẽn cổ chai`, [
      'cpu',
      'gpu',
    ]),
  ];
};

const c14: Rule = (parts, { budget }) => {
  const present = (Object.entries(parts) as [CategoryKey, EngineProduct | undefined][]).filter(
    (entry): entry is [CategoryKey, EngineProduct] => entry[1] !== undefined,
  );
  if (budget === undefined || present.length === 0) return [];
  const total = present.reduce((sum, [, p]) => sum + p.price, 0);
  const categories = present.map(([category]) => category);
  if (total > budget) {
    return [
      issue('C14', 'error', `Tổng giá ${formatVnd(total)} vượt ngân sách ${formatVnd(budget)}`, categories),
    ];
  }
  if (total * 100 < budget * MIN_BUDGET_USE_PERCENT) {
    const percent = Math.round((total * 100) / budget);
    return [
      issue('C14', 'warning', `Tổng giá chỉ dùng ${percent}% ngân sách ${formatVnd(budget)}`, categories),
    ];
  }
  return [];
};

export const RULES: Record<RuleCode, Rule> = {
  C01: c01,
  C02: c02,
  C03: c03,
  C04: c04,
  C05: c05,
  C06: c06,
  C07: c07,
  C08: c08,
  C09: c09,
  C10: c10,
  C11: c11,
  C12: c12,
  C13: c13,
  C14: c14,
};

/** Hard binary rules per unordered category pair, evaluated pairwise by the solver (AC-3 / forward checking). */
export const PAIR_RULES: ReadonlyArray<{ a: CategoryKey; b: CategoryKey; codes: RuleCode[] }> = [
  { a: 'cpu', b: 'mainboard', codes: ['C01'] },
  { a: 'cpu', b: 'ram', codes: ['C02'] },
  { a: 'mainboard', b: 'ram', codes: ['C02', 'C03'] },
  { a: 'mainboard', b: 'case', codes: ['C04'] },
  { a: 'gpu', b: 'case', codes: ['C05'] },
  { a: 'cooler', b: 'case', codes: ['C06'] },
  { a: 'cpu', b: 'cooler', codes: ['C07'] },
  { a: 'cpu', b: 'gpu', codes: ['C10'] },
  { a: 'mainboard', b: 'storage', codes: ['C11'] },
  { a: 'psu', b: 'case', codes: ['C12'] },
];

export function pairCompatible(codes: readonly RuleCode[], parts: PartMap): boolean {
  for (const code of codes) {
    if (RULES[code](parts, {}).some((i) => i.severity === 'error')) return false;
  }
  return true;
}
