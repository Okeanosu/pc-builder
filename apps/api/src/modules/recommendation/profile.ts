import { DEFAULT_PROFILES, type PurposeProfile } from '@pc/engine';
import { CATEGORY_KEYS, type Purpose } from '@pc/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { purposeWeights } from '../../db/schema';

const isRatio = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function isComplete(weights: unknown, allocation: unknown): boolean {
  const w = weights as Record<string, unknown> | null;
  const a = allocation as Record<string, { min?: unknown; max?: unknown } | undefined> | null;
  return CATEGORY_KEYS.every(
    (c) =>
      isRatio(w?.[c]) &&
      isRatio(a?.[c]?.min) &&
      isRatio(a?.[c]?.max) &&
      Number(a?.[c]?.min) <= Number(a?.[c]?.max),
  );
}

/** Admin-tuned weights from purpose_weights; the engine defaults when the row is missing or malformed. */
export async function loadPurposeProfile(db: Db, purpose: Purpose): Promise<PurposeProfile> {
  const [row] = await db.select().from(purposeWeights).where(eq(purposeWeights.purpose, purpose)).limit(1);
  if (!row || !isComplete(row.weights, row.allocation)) return DEFAULT_PROFILES[purpose];
  return { purpose, weights: row.weights, allocation: row.allocation };
}
