import { CATEGORY_KEYS, CATEGORY_LABELS, type CategoryKey, type SpecField } from '@pc/shared';

const SOCKET_OPTIONS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'];
const MEMORY_OPTIONS = ['DDR4', 'DDR5'];
const FORM_FACTOR_OPTIONS = ['ATX', 'mATX', 'ITX'];
const COLOR_OPTIONS = ['black', 'white', 'other'];
const PSU_FORM_OPTIONS = ['ATX', 'SFX'];

type FieldInit = Omit<SpecField, 'key' | 'required'> & { required?: boolean };
const f = (key: string, init: FieldInit): SpecField => ({ key, required: true, ...init });

export const SPEC_FIELDS: Record<CategoryKey, SpecField[]> = {
  cpu: [
    f('socket', { label: 'Socket', type: 'enum', options: SOCKET_OPTIONS, filterable: true }),
    f('cores', { label: 'Số nhân', type: 'number', filterable: true }),
    f('threads', { label: 'Số luồng', type: 'number', filterable: false }),
    f('baseClockGHz', { label: 'Xung nhịp cơ bản', type: 'number', unit: 'GHz', filterable: false }),
    f('boostClockGHz', { label: 'Xung nhịp tối đa', type: 'number', unit: 'GHz', filterable: false }),
    f('tdpW', { label: 'TDP', type: 'number', unit: 'W', filterable: false }),
    f('integratedGraphics', { label: 'Đồ họa tích hợp', type: 'boolean', filterable: true }),
    f('memoryTypes', { label: 'Loại RAM hỗ trợ', type: 'enum[]', options: MEMORY_OPTIONS, filterable: true }),
  ],
  mainboard: [
    f('socket', { label: 'Socket', type: 'enum', options: SOCKET_OPTIONS, filterable: true }),
    f('chipset', { label: 'Chipset', type: 'string', filterable: true }),
    f('formFactor', { label: 'Kích thước', type: 'enum', options: FORM_FACTOR_OPTIONS, filterable: true }),
    f('memoryType', { label: 'Loại RAM', type: 'enum', options: MEMORY_OPTIONS, filterable: true }),
    f('memorySlots', { label: 'Số khe RAM', type: 'number', filterable: false }),
    f('maxMemoryGB', { label: 'RAM tối đa', type: 'number', unit: 'GB', filterable: false }),
    f('m2Slots', { label: 'Số khe M.2', type: 'number', filterable: true }),
    f('wifi', { label: 'Wi-Fi tích hợp', type: 'boolean', filterable: true }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
  ram: [
    f('type', { label: 'Loại RAM', type: 'enum', options: MEMORY_OPTIONS, filterable: true }),
    f('capacityGB', { label: 'Dung lượng', type: 'number', unit: 'GB', filterable: true }),
    f('modules', { label: 'Số thanh', type: 'number', filterable: false }),
    f('speedMHz', { label: 'Tốc độ', type: 'number', unit: 'MHz', filterable: true }),
    f('casLatency', { label: 'Độ trễ CAS', type: 'number', unit: 'CL', filterable: false }),
    f('rgb', { label: 'Đèn RGB', type: 'boolean', filterable: true }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
  gpu: [
    f('chipset', { label: 'Chip đồ họa', type: 'string', filterable: true }),
    f('chipsetBrand', {
      label: 'Hãng chip',
      type: 'enum',
      options: ['NVIDIA', 'AMD', 'Intel'],
      filterable: true,
    }),
    f('vramGB', { label: 'Bộ nhớ VRAM', type: 'number', unit: 'GB', filterable: true }),
    f('lengthMm', { label: 'Chiều dài card', type: 'number', unit: 'mm', filterable: false }),
    f('tgpW', { label: 'Công suất tiêu thụ (TGP)', type: 'number', unit: 'W', filterable: false }),
    f('recommendedPsuW', { label: 'Nguồn đề xuất', type: 'number', unit: 'W', filterable: false }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
  storage: [
    f('interface', { label: 'Chuẩn giao tiếp', type: 'enum', options: ['NVMe', 'SATA'], filterable: true }),
    f('formFactor', { label: 'Kích thước', type: 'enum', options: ['M.2', '2.5"'], filterable: true }),
    f('capacityGB', { label: 'Dung lượng', type: 'number', unit: 'GB', filterable: true }),
    f('readMBps', { label: 'Tốc độ đọc', type: 'number', unit: 'MB/s', filterable: false }),
    f('writeMBps', { label: 'Tốc độ ghi', type: 'number', unit: 'MB/s', filterable: false }),
  ],
  psu: [
    f('wattage', { label: 'Công suất', type: 'number', unit: 'W', filterable: true }),
    f('efficiency', {
      label: 'Chứng nhận hiệu suất',
      type: 'enum',
      options: ['80+ White', '80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium'],
      filterable: true,
    }),
    f('formFactor', { label: 'Kích thước nguồn', type: 'enum', options: PSU_FORM_OPTIONS, filterable: true }),
    f('modular', { label: 'Dây rời (modular)', type: 'boolean', filterable: true }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
  case: [
    f('supportedFormFactors', {
      label: 'Mainboard hỗ trợ',
      type: 'enum[]',
      options: FORM_FACTOR_OPTIONS,
      filterable: true,
    }),
    f('maxGpuLengthMm', { label: 'Card đồ họa tối đa', type: 'number', unit: 'mm', filterable: false }),
    f('maxCoolerHeightMm', { label: 'Tản khí cao tối đa', type: 'number', unit: 'mm', filterable: false }),
    f('radiatorSupportMm', { label: 'Radiator hỗ trợ', type: 'number[]', unit: 'mm', filterable: false }),
    f('psuFormFactors', {
      label: 'Nguồn hỗ trợ',
      type: 'enum[]',
      options: PSU_FORM_OPTIONS,
      filterable: true,
    }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
  cooler: [
    f('type', { label: 'Loại tản nhiệt', type: 'enum', options: ['air', 'aio'], filterable: true }),
    f('sockets', { label: 'Socket hỗ trợ', type: 'enum[]', options: SOCKET_OPTIONS, filterable: true }),
    f('heightMm', {
      label: 'Chiều cao tản khí',
      type: 'number',
      unit: 'mm',
      required: false,
      filterable: false,
    }),
    f('radiatorMm', {
      label: 'Kích thước radiator',
      type: 'number',
      unit: 'mm',
      required: false,
      filterable: true,
    }),
    f('tdpRatingW', { label: 'Khả năng tản nhiệt', type: 'number', unit: 'W', filterable: false }),
    f('rgb', { label: 'Đèn RGB', type: 'boolean', filterable: true }),
    f('color', { label: 'Màu sắc', type: 'enum', options: COLOR_OPTIONS, filterable: true }),
  ],
};

export const CATEGORY_ROWS = CATEGORY_KEYS.map((key: CategoryKey, index) => ({
  key,
  slug: key,
  name: CATEGORY_LABELS[key],
  sortOrder: index + 1,
  specSchema: SPEC_FIELDS[key],
}));
