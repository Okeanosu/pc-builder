import { randomUUID } from 'node:crypto';
import type { Redis } from '../../lib/redis';

const RELEASE_IF_OWNER = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;

export interface RedisLock {
  release(): Promise<void>;
}

/**
 * Best-effort mutual exclusion with `SET key token NX PX ttl`. Returns null when someone else holds it.
 * Release only deletes our own token, so a lock that expired and was re-taken is never stolen.
 */
export async function tryLock(redis: Redis, key: string, ttlMs: number): Promise<RedisLock | null> {
  const token = randomUUID();
  if ((await redis.set(key, token, 'PX', ttlMs, 'NX')) !== 'OK') return null;
  return {
    async release() {
      try {
        await redis.eval(RELEASE_IF_OWNER, 1, key, token);
      } catch {
        // the TTL frees the lock anyway; never mask the caller's own outcome
      }
    },
  };
}
