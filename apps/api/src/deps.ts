import type { Env } from './config/env';
import type { Db } from './db/client';
import type { Redis } from './lib/redis';
import type { LlmClient } from './modules/chat/llm/types';

/** Everything a module may need; tests build this with real Postgres/Redis and a fake LLM. */
export interface AppDeps {
  db: Db;
  redis: Redis;
  env: Env;
  /** Undefined ⇒ chatbot runs in fallback mode. */
  llm?: LlmClient;
  now: () => Date;
}
