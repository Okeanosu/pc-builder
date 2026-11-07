import { z } from 'zod';
import type { CategoryKey } from './constants';

export const SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'] as const;
export type Socket = (typeof SOCKETS)[number];
export const MEMORY_TYPES = ['DDR4', 'DDR5'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];
export const FORM_FACTORS = ['ATX', 'mATX', 'ITX'] as const;
export type FormFactor = (typeof FORM_FACTORS)[number];
export const COLORS = ['black', 'white', 'other'] as const;
export type Color = (typeof COLORS)[number];
export const PSU_FORM_FACTORS = ['ATX', 'SFX'] as const;
export type PsuFormFactor = (typeof PSU_FORM_FACTORS)[number];
export const GPU_BRANDS = ['NVIDIA', 'AMD', 'Intel'] as const;
export type GpuBrand = (typeof GPU_BRANDS)[number];

const socket = z.enum(SOCKETS);
const memoryType = z.enum(MEMORY_TYPES);
const formFactor = z.enum(FORM_FACTORS);
const color = z.enum(COLORS);
const psuFormFactor = z.enum(PSU_FORM_FACTORS);
const posInt = z.number().int().positive();
const nonNegInt = z.number().int().nonnegative();

export const cpuSpecsSchema = z.object({
  socket,
  cores: posInt,
  threads: posInt,
  baseClockGHz: z.number().positive(),
  boostClockGHz: z.number().positive(),
  tdpW: posInt,
  integratedGraphics: z.boolean(),
  memoryTypes: z.array(memoryType).min(1),
});
export const mainboardSpecsSchema = z.object({
  socket,
  chipset: z.string().min(1),
  formFactor,
  memoryType,
  memorySlots: posInt,
  maxMemoryGB: posInt,
  m2Slots: nonNegInt,
  wifi: z.boolean(),
  color,
});
export const ramSpecsSchema = z.object({
  type: memoryType,
  capacityGB: posInt,
  modules: posInt,
  speedMHz: posInt,
  casLatency: posInt,
  rgb: z.boolean(),
  color,
});
export const gpuSpecsSchema = z.object({
  chipset: z.string().min(1),
  chipsetBrand: z.enum(GPU_BRANDS),
  vramGB: posInt,
  lengthMm: posInt,
  tgpW: posInt,
  recommendedPsuW: posInt,
  color,
});
export const storageSpecsSchema = z.object({
  interface: z.enum(['NVMe', 'SATA']),
  formFactor: z.enum(['M.2', '2.5"']),
  capacityGB: posInt,
  readMBps: posInt,
  writeMBps: posInt,
});
export const psuSpecsSchema = z.object({
  wattage: posInt,
  efficiency: z.string().min(1),
  formFactor: psuFormFactor,
  modular: z.boolean(),
  color,
});
export const caseSpecsSchema = z.object({
  supportedFormFactors: z.array(formFactor).min(1),
  maxGpuLengthMm: posInt,
  maxCoolerHeightMm: posInt,
  radiatorSupportMm: z.array(posInt),
  psuFormFactors: z.array(psuFormFactor).min(1),
  color,
});
export const coolerSpecsSchema = z.object({
  type: z.enum(['air', 'aio']),
  sockets: z.array(socket).min(1),
  heightMm: posInt.optional(),
  radiatorMm: posInt.optional(),
  tdpRatingW: posInt,
  rgb: z.boolean(),
  color,
});

export type CpuSpecs = z.infer<typeof cpuSpecsSchema>;
export type MainboardSpecs = z.infer<typeof mainboardSpecsSchema>;
export type RamSpecs = z.infer<typeof ramSpecsSchema>;
export type GpuSpecs = z.infer<typeof gpuSpecsSchema>;
export type StorageSpecs = z.infer<typeof storageSpecsSchema>;
export type PsuSpecs = z.infer<typeof psuSpecsSchema>;
export type CaseSpecs = z.infer<typeof caseSpecsSchema>;
export type CoolerSpecs = z.infer<typeof coolerSpecsSchema>;

export interface SpecsByCategory {
  cpu: CpuSpecs;
  mainboard: MainboardSpecs;
  ram: RamSpecs;
  gpu: GpuSpecs;
  storage: StorageSpecs;
  psu: PsuSpecs;
  case: CaseSpecs;
  cooler: CoolerSpecs;
}
export type AnySpecs = SpecsByCategory[CategoryKey];

export const SPEC_SCHEMAS: { [K in CategoryKey]: z.ZodType<SpecsByCategory[K]> } = {
  cpu: cpuSpecsSchema,
  mainboard: mainboardSpecsSchema,
  ram: ramSpecsSchema,
  gpu: gpuSpecsSchema,
  storage: storageSpecsSchema,
  psu: psuSpecsSchema,
  case: caseSpecsSchema,
  cooler: coolerSpecsSchema,
};

export interface Benchmark {
  cpuSingle?: number;
  cpuMulti?: number;
  gpuScore?: number;
}

/** Field descriptor stored in categories.spec_schema; drives admin forms and storefront filters. */
export interface SpecField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'enum[]' | 'number[]';
  unit?: string;
  options?: string[];
  required: boolean;
  filterable: boolean;
}
