import { z } from 'zod';
import { AppError, notFound } from '../../lib/errors';
import { requireRole } from '../../middleware/auth';
import { isGuid } from '../cart/cart.service';

export const adminOnly = requireRole('ADMIN');

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function idParam(value: unknown, what: string): string {
  const id = String(value);
  if (!isGuid(id)) throw notFound(what);
  return id;
}

export interface FieldIssue {
  path: string;
  message: string;
}

/** Same shape as the global ZodError mapping so clients render every 422 the same way. */
export const validationError = (details: FieldIssue[]) =>
  new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', details);

/** Name of the violated unique constraint when `err` (possibly wrapped by drizzle) is a PG 23505. */
export function uniqueViolation(err: unknown): string | null {
  let e: unknown = err;
  for (let depth = 0; depth < 4 && e && typeof e === 'object'; depth++) {
    const pg = e as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (pg.code === '23505') return typeof pg.constraint_name === 'string' ? pg.constraint_name : 'unique';
    e = pg.cause;
  }
  return null;
}

/** "Vỏ case NZXT H5 trắng" → "vo-case-nzxt-h5-trang" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
