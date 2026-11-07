import type { SpecField } from '@pc/shared';

export { formatVnd, formatVndShort } from '@pc/shared';

const percent0 = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 });
const percent1 = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** 0.2346 → "23%" (or "23,5%" with one digit) */
export function formatPercent(share: number, digits: 0 | 1 = 0): string {
  return (digits === 0 ? percent0 : percent1).format(share);
}

export function formatNumber(n: number): string {
  return decimal.format(n);
}

/** 512 → "512GB", 2000 → "2TB" */
export function formatCapacityGB(gb: number): string {
  return gb >= 1000 && gb % 500 === 0 ? `${formatNumber(gb / 1000)}TB` : `${formatNumber(gb)}GB`;
}

const COLOR_LABELS: Record<string, string> = { black: 'Đen', white: 'Trắng', other: 'Khác' };

/** Renders one spec value for SpecTable; `null` means "nothing to show". */
export function formatSpecValue(value: unknown, field?: Pick<SpecField, 'unit' | 'key'>): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.map((v) => formatSpecValue(v, field) ?? '').join(', ');
  }
  if (typeof value === 'number') {
    const unit = field?.unit;
    if (unit === 'GB' && field?.key && /capacity/i.test(field.key)) return formatCapacityGB(value);
    return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
  }
  const text = String(value);
  if (field?.key === 'color') return COLOR_LABELS[text] ?? text;
  return field?.unit ? `${text} ${field.unit}` : text;
}

type KeySpecFormatter = (v: number) => string;
const KEY_SPEC_NUMBER: Record<string, KeySpecFormatter> = {
  cores: (v) => `${v} nhân`,
  threads: (v) => `${v} luồng`,
  baseClockGHz: (v) => `${formatNumber(v)}GHz`,
  boostClockGHz: (v) => `${formatNumber(v)}GHz`,
  tdpW: (v) => `TDP ${v}W`,
  tgpW: (v) => `${v}W`,
  vramGB: (v) => `${v}GB VRAM`,
  capacityGB: formatCapacityGB,
  maxMemoryGB: (v) => `Tối đa ${v}GB`,
  memorySlots: (v) => `${v} khe RAM`,
  modules: (v) => (v > 1 ? `Kit ${v} thanh` : '1 thanh'),
  speedMHz: (v) => `${v}MHz`,
  casLatency: (v) => `CL${v}`,
  wattage: (v) => `${v}W`,
  readMBps: (v) => `Đọc ${formatNumber(v)}MB/s`,
  writeMBps: (v) => `Ghi ${formatNumber(v)}MB/s`,
  lengthMm: (v) => `Dài ${v}mm`,
  heightMm: (v) => `Cao ${v}mm`,
  radiatorMm: (v) => `Rad ${v}mm`,
  tdpRatingW: (v) => `Tản ${v}W`,
  m2Slots: (v) => `${v} khe M.2`,
  maxGpuLengthMm: (v) => `GPU ≤ ${v}mm`,
  maxCoolerHeightMm: (v) => `Tản ≤ ${v}mm`,
};
const KEY_SPEC_FLAG: Record<string, string> = {
  wifi: 'Wi-Fi',
  rgb: 'RGB',
  modular: 'Full modular',
  integratedGraphics: 'Có iGPU',
};

/** Short chip text for ProductSummaryDTO.keySpecs, e.g. ('cores', 8) → "8 nhân". */
export function formatKeySpec(key: string, value: string | number | boolean): string | null {
  if (typeof value === 'boolean') return value ? (KEY_SPEC_FLAG[key] ?? key) : null;
  if (typeof value === 'number') return KEY_SPEC_NUMBER[key]?.(value) ?? formatNumber(value);
  if (key === 'color') return COLOR_LABELS[value] ?? value;
  return value;
}
