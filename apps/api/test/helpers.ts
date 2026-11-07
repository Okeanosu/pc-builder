import { loadEnv } from '../src/config/env';
import { createDb } from '../src/db/client';
import type { AppDeps } from '../src/deps';
import { createRedis, type Redis } from '../src/lib/redis';

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

/** The same client, except that every MULTI rejects on exec(), as it does when Redis goes away mid-request. */
export function redisWithFailingMulti(redis: Redis): Redis {
  return new Proxy(redis, {
    get(target, prop, receiver) {
      if (prop === 'multi') {
        return () => {
          const tx = target.multi();
          tx.exec = () => Promise.reject(new Error('simulated Redis outage'));
          return tx;
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
