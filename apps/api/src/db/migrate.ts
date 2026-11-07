import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { isEntrypoint } from '../lib/entrypoint';
import { createDb } from './client';

/** fileURLToPath decodes %20 and non-ASCII characters that URL.pathname would leave encoded. */
export const migrationsFolder = (moduleUrl: string = import.meta.url): string =>
  fileURLToPath(new URL('../../drizzle', moduleUrl));

export async function runMigrations(url: string): Promise<void> {
  const { db, sql } = createDb(url);
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    await migrate(db, { migrationsFolder: migrationsFolder() });
  } finally {
    await sql.end();
  }
}

if (isEntrypoint(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  await runMigrations(url);
  console.log('migrations applied');
}
