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

/**
 * The same client, except that every MULTI fails on exec(): `rejects` as when Redis goes away mid-request,
 * `reply-error` as when a queued command fails, which ioredis reports as an `[err, null]` reply.
 */
export function redisWithFailingMulti(redis: Redis, failure: 'rejects' | 'reply-error' = 'rejects'): Redis {
  return new Proxy(redis, {
    get(target, prop, receiver) {
      if (prop === 'multi') {
        return () => {
          const tx = target.multi();
          tx.exec = () =>
            failure === 'rejects'
              ? Promise.reject(new Error('simulated Redis outage'))
              : Promise.resolve([[new Error('simulated command failure'), null]]);
          return tx;
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
