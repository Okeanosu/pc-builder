import type { CategoryKey } from '@pc/shared';
import { CASES } from './case';
import { COOLERS } from './cooler';
import { CPUS } from './cpu';
import { GPUS } from './gpu';
import type { SeedProduct } from './helpers';
import { MAINBOARDS } from './mainboard';
import { PSUS } from './psu';
import { RAMS } from './ram';
import { STORAGES } from './storage';

const withPromotions = <K extends CategoryKey>(products: SeedProduct<K>[]): SeedProduct<K>[] =>
  products.map((p, i) =>
    i % 9 === 4 && p.stock > 0 ? { ...p, salePrice: Math.round((p.price * 0.93) / 10_000) * 10_000 } : p,
  );

export const CATALOG: { [K in CategoryKey]: SeedProduct<K>[] } = {
  cpu: withPromotions(CPUS),
  mainboard: withPromotions(MAINBOARDS),
  ram: withPromotions(RAMS),
  gpu: withPromotions(GPUS),
  storage: withPromotions(STORAGES),
  psu: withPromotions(PSUS),
  case: withPromotions(CASES),
  cooler: withPromotions(COOLERS),
};
