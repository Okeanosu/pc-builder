import { Redis } from 'ioredis';

export function createRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
}

/** SCAN-based delete, so a large keyspace is never blocked the way KEYS would block it. */
export async function deleteKeysByPattern(redis: Redis, pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    if (keys.length > 0) deleted += await redis.del(...keys);
    cursor = next;
  } while (cursor !== '0');
  return deleted;
}

export type { Redis };
