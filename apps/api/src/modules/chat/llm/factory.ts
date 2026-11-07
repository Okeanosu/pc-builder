import type { Env } from '../../../config/env';
import type { LlmClient } from './types';

/** Returns undefined when no key is configured so the chatbot starts in fallback mode. */
export function createLlmFromEnv(env: Env): LlmClient | undefined {
  if (!env.GEMINI_API_KEY) return undefined;
  return undefined;
}
