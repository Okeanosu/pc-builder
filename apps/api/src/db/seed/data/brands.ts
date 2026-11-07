import { CASES } from './case';
import { COOLERS } from './cooler';
import { CPUS } from './cpu';
import { GPUS } from './gpu';
import { MAINBOARDS } from './mainboard';
import { PSUS } from './psu';
import { RAMS } from './ram';
import { STORAGES } from './storage';

export const BRAND_NAMES: string[] = [
  ...new Set(
    [...CPUS, ...MAINBOARDS, ...RAMS, ...GPUS, ...STORAGES, ...PSUS, ...CASES, ...COOLERS].map(
      (p) => p.brand,
    ),
  ),
].sort((a, b) => a.localeCompare(b));
