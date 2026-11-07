/**
 * Live smoke test of the Gemini path: two real tool-calling turns against the dev database.
 * Turn 1 must reach Gemini with all five tool declarations and get a recommend_builds call back;
 * turn 2 replays the stored-style history (without thought signatures) and should modify the build.
 *
 *   pnpm --filter @pc/api exec tsx --env-file=../../.env eval/smoke-gemini.ts
 *
 * Exit code: 0 PASS, 1 FAIL, 2 SKIP (GEMINI_API_KEY is empty).
 */
import { randomUUID } from 'node:crypto';
import type { ChatEvent } from '@pc/shared';
import { loadEnv } from '../src/config/env';
import { createDb } from '../src/db/client';
import type { AppDeps } from '../src/deps';
import { createRedis } from '../src/lib/redis';
import { type HistoryRow, toLlmHistory } from '../src/modules/chat/chat.history';
import { createGeminiClient } from '../src/modules/chat/llm/gemini-client';
import type { LlmChunk, LlmClient } from '../src/modules/chat/llm/types';
import { type RunTurnResult, runTurn } from '../src/modules/chat/orchestrator';
import { createToolRegistry } from '../src/modules/chat/tools/registry';
import { toInt } from '../src/modules/chat/tools/shared';

const env = loadEnv();
if (!env.GEMINI_API_KEY) {
  console.log('SKIP  GEMINI_API_KEY is empty.');
  console.log(
    '      Add a key from https://aistudio.google.com/apikey to .env (GEMINI_API_KEY=...) and re-run.',
  );
  process.exit(2);
}

const warnings: string[] = [];
const gemini = createGeminiClient({
  apiKey: env.GEMINI_API_KEY,
  model: env.GEMINI_MODEL,
  logger: { warn: (m) => warnings.push(m) },
});
const received: LlmChunk[] = [];
const recording: LlmClient = {
  async *stream(input) {
    for await (const chunk of gemini.stream(input)) {
      received.push(chunk);
      yield chunk;
    }
  },
};

const { db, sql } = createDb(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL);
const deps: AppDeps = { db, redis, env, llm: recording, now: () => new Date() };
const tools = createToolRegistry(deps);
const sessionId = randomUUID();
const rows: HistoryRow[] = [];
let failed = false;

const report = (ok: boolean | 'warn', label: string, detail = '') => {
  if (ok === false) failed = true;
  console.log(`${ok === 'warn' ? 'WARN' : ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function turn(text: string, previous?: RunTurnResult) {
  received.length = 0;
  warnings.length = 0;
  const events: ChatEvent[] = [];
  const started = performance.now();
  const result = await runTurn(
    {
      sessionId,
      userText: text,
      history: toLlmHistory(rows),
      previousIntent: previous?.intent,
      ctx: { sessionId, guestId: 'smoke-gemini' },
    },
    { llm: recording, tools, emit: (e) => events.push(e), timeoutMs: env.GEMINI_TIMEOUT_MS },
  );
  const blank = { toolName: null, toolArgs: null, toolResult: null };
  rows.push(
    { role: 'user', content: text, ...blank },
    ...result.toolCalls.map((c) => ({
      role: 'tool' as const,
      content: '',
      toolName: c.name,
      toolArgs: c.args,
      toolResult: c.response,
    })),
    { role: 'assistant', content: result.assistantText, ...blank },
  );
  const calls = received.filter(
    (c): c is Extract<LlmChunk, { type: 'functionCall' }> => c.type === 'functionCall',
  );
  return { result, events, calls, ms: performance.now() - started };
}

async function main() {
  console.log(`Gemini smoke test — model ${env.GEMINI_MODEL}, timeout ${env.GEMINI_TIMEOUT_MS} ms\n`);

  const first = await turn('Mình chơi game 2K, ngân sách 25 triệu, thích CPU AMD');
  report(
    first.result.mode === 'AI',
    'turn 1 answered by Gemini (tool declarations accepted)',
    first.result.mode === 'AI' ? '' : `fell back: ${first.result.fallbackReason}; ${warnings.join(' | ')}`,
  );
  const rec = first.calls.find((c) => c.name === 'recommend_builds');
  const budget = toInt(rec?.args.budget);
  report(
    Boolean(rec) &&
      rec?.args.purpose === 'gaming' &&
      budget !== undefined &&
      Math.abs(budget - 25e6) <= 1.25e6,
    'Gemini called recommend_builds with purpose gaming and budget ≈ 25.000.000',
    rec ? JSON.stringify(rec.args) : `calls: ${first.calls.map((c) => c.name).join(', ') || 'none'}`,
  );
  const builds = first.events.flatMap((e) => (e.type === 'builds' ? e.builds : []));
  report(
    builds.length > 0 && builds.every((b) => b.totalPrice <= 25_000_000),
    'builds event with in-budget builds',
    `${builds.length} build(s)`,
  );
  report(
    first.result.assistantText.trim().length > 0,
    'streamed a Vietnamese explanation',
    `${first.ms.toFixed(0)} ms`,
  );
  console.log(`\n      Reply: ${first.result.assistantText.replaceAll('\n', ' ').slice(0, 400)}\n`);

  const second = await turn('Rẻ hơn khoảng 2 triệu được không?', first.result);
  report(
    second.result.mode === 'AI',
    'turn 2 with rebuilt history answered by Gemini',
    second.result.mode === 'AI' ? '' : `fell back: ${second.result.fallbackReason}; ${warnings.join(' | ')}`,
  );
  const names = second.calls.map((c) => c.name);
  report(
    names.includes('modify_build') ? true : 'warn',
    'Gemini used modify_build for the follow-up',
    names.join(', ') || 'no tool call',
  );
  console.log(`\n      Reply: ${second.result.assistantText.replaceAll('\n', ' ').slice(0, 400)}\n`);
  console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
  return failed ? 1 : 0;
}

main()
  .then(async (code) => {
    await Promise.allSettled([sql.end(), redis.quit()]);
    process.exit(code);
  })
  .catch(async (err) => {
    console.error('FAIL  unexpected error:', err);
    await Promise.allSettled([sql.end(), redis.quit()]);
    process.exit(1);
  });
