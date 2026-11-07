import { createApp } from './app';
import { env } from './config/env';
import { createDb } from './db/client';
import { createRedis } from './lib/redis';
import { createLlmFromEnv } from './modules/chat/llm/factory';

const { db, sql } = createDb(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL);
const llm = createLlmFromEnv(env);

const app = createApp({ db, redis, env, llm, now: () => new Date() });
const server = app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT} (AI mode: ${llm ? env.GEMINI_MODEL : 'fallback'})`);
});

async function shutdown() {
  server.close();
  await Promise.allSettled([sql.end(), redis.quit()]);
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
