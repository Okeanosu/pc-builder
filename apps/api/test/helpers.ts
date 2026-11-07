import { loadEnv } from '../src/config/env';
import { createDb } from '../src/db/client';
import type { AppDeps } from '../src/deps';
import { createRedis } from '../src/lib/redis';

/** Real Postgres (pcbuilder_test) + Redis db 1. Call `close()` in afterAll. */
export function createTestDeps(overrides: Partial<AppDeps> = {}) {
  const env = loadEnv(process.env);
  const { db, sql } = createDb(env.DATABASE_URL);
  const redis = createRedis(env.REDIS_URL);
  const deps: AppDeps = { db, redis, env, now: () => new Date(), ...overrides };
  return {
    deps,
    sql,
    async reset() {
      await sql`TRUNCATE chat_messages, chat_sessions, payments, order_items, orders, cart_items, carts, builds,
        inventory_movements, benchmarks, products, brands, categories, purpose_weights, users RESTART IDENTITY CASCADE`;
      await redis.flushdb();
    },
    async close() {
      await Promise.allSettled([sql.end(), redis.quit()]);
    },
  };
}
