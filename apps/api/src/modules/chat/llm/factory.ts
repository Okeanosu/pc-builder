import type { Env } from '../../../config/env';
import { createGeminiClient, type GeminiLogger } from './gemini-client';
import type { LlmClient } from './types';

/** Returns undefined when no key is configured so the chatbot starts in fallback mode. */
export function createLlmFromEnv(env: Env, logger?: GeminiLogger): LlmClient | undefined {
  if (!env.GEMINI_API_KEY) return undefined;
  return createGeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, logger });
}
