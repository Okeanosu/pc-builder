import { CATEGORY_KEYS, CATEGORY_LABELS, type CategoryKey } from '@pc/shared';

export { CATEGORY_KEYS, CATEGORY_LABELS };

/** Category identity colour (CSS value). For marks only — swatches, bar segments, illustration details — never text. */
export const CATEGORY_COLOR: Record<CategoryKey, string> = {
  cpu: 'var(--color-cat-cpu)',
  mainboard: 'var(--color-cat-mainboard)',
  ram: 'var(--color-cat-ram)',
  gpu: 'var(--color-cat-gpu)',
  storage: 'var(--color-cat-storage)',
  psu: 'var(--color-cat-psu)',
  case: 'var(--color-cat-case)',
  cooler: 'var(--color-cat-cooler)',
};
