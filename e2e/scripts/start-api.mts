/**
 * Playwright webServer entry for the API: migrates and re-seeds the dedicated E2E database, empties its
 * Redis db, then starts the real server in this process. Every run therefore starts from the same catalog,
 * stock and purpose weights. Run from apps/api: `pnpm --filter @pc/api exec tsx ../../e2e/scripts/start-api.mts`.
 */
import { createDb } from '../../apps/api/src/db/client';
import { runMigrations } from '../../apps/api/src/db/migrate';
import { seedDatabase } from '../../apps/api/src/db/seed';
import { createRedis } from '../../apps/api/src/lib/redis';

const databaseUrl = process.env.DATABASE_URL ?? '';
const redisUrl = process.env.REDIS_URL ?? '';

// Seeding truncates every table: refuse anything that does not look like a throwaway database.
if (!/e2e/i.test(databaseUrl) && process.env.E2E_ALLOW_ANY_DB !== '1') {
  throw new Error(`Refusing to reseed ${databaseUrl || '(unset DATABASE_URL)'}: name must contain "e2e"`);
}
if (/\/[01]$/.test(redisUrl) && process.env.E2E_ALLOW_ANY_DB !== '1') {
  throw new Error(`Refusing to flush ${redisUrl}: Redis db 0/1 belong to dev and the API tests`);
}

await runMigrations(databaseUrl);
const { db, sql } = createDb(databaseUrl);
const seeded = await seedDatabase(db);
await sql.end();
const redis = createRedis(redisUrl);
await redis.flushdb();
await redis.quit();
console.log(`[e2e] seeded ${seeded.products} products into ${databaseUrl}, flushed ${redisUrl}`);

await import('../../apps/api/src/server');
