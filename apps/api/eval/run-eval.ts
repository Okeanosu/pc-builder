/**
 * Golden-set evaluation of the AI advisor: runs every case through runTurn with the real tools on the dev
 * database (real Gemini when GEMINI_API_KEY is set, otherwise the rule-based fallback) and writes results.md.
 *
 *   pnpm --filter @pc/api eval:ai [--fallback] [--warm] [--only=G01,F02] [--delay-ms=6500]
 *     [--golden=path/to/set.json] [--out=eval/results.md]
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ChatEvent, formatVnd, type Preferences } from '@pc/shared';
import { loadEnv } from '../src/config/env';
import { createDb } from '../src/db/client';
import type { AppDeps } from '../src/deps';
import { bumpCatalogVersion } from '../src/lib/catalog-version';
import { createRedis } from '../src/lib/redis';
import { createBuildsService } from '../src/modules/builds';
import { HISTORY_LIMIT, type HistoryRow, toLlmHistory } from '../src/modules/chat/chat.history';
import type { ParsedIntent } from '../src/modules/chat/fallback/nlu';
import { createLlmFromEnv } from '../src/modules/chat/llm/factory';
import { runTurn } from '../src/modules/chat/orchestrator';
import type { ToolCallRecord } from '../src/modules/chat/tools/execute';
import { createToolRegistry } from '../src/modules/chat/tools/registry';
import { sanitizePreferences, toInt } from '../src/modules/chat/tools/shared';
import { createCompatibilityService } from '../src/modules/compatibility';

type ToolName =
  | 'recommend_builds'
  | 'modify_build'
  | 'search_products'
  | 'get_product_details'
  | 'check_compatibility';

interface Expectation {
  tool: ToolName | null;
  purpose?: string;
  budget?: number;
  builds: boolean;
  question?: boolean;
  infeasible?: boolean;
  preferences?: Partial<Preferences>;
}

interface GoldenCase {
  id: string;
  category: string;
  note: string;
  setup?: string[];
  prompt: string;
  expect: Expectation;
  fallbackExpect?: Partial<Expectation>;
}

interface Check {
  name: 'tool' | 'params' | 'preferences' | 'builds' | 'question' | 'infeasible' | 'valid';
  ok: boolean;
  detail: string;
}

interface CaseResult {
  c: GoldenCase;
  expect: Expectation;
  mode: string;
  fallbackReason?: string;
  tools: string[];
  latencyMs: number;
  reply: string;
  checks: Check[];
  builds: { total: number; valid: number };
}

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}`))?.split('=')[1] ?? '';
const flag = (name: string) => process.argv.includes(`--${name}`);

const env = loadEnv();
const { db, sql } = createDb(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL);
const llmWarnings: string[] = [];
const llm = flag('fallback') ? undefined : createLlmFromEnv(env, { warn: (m) => llmWarnings.push(m) });
const deps: AppDeps = { db, redis, env, llm, now: () => new Date() };
const tools = createToolRegistry(deps);
const compatibility = createCompatibilityService(deps);
const buildsService = createBuildsService(deps);
const delayMs = Number(arg('delay-ms') || (llm ? 6500 : 0));

const goldenPath = arg('golden') ? resolve(process.cwd(), arg('golden')) : resolve(here, 'golden-set.json');
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { cases: GoldenCase[] };
const only = new Set(arg('only').split(',').filter(Boolean));
const cases = golden.cases.filter((c) => only.size === 0 || only.has(c.id));

interface Conversation {
  sessionId: string;
  rows: HistoryRow[];
  intent?: ParsedIntent;
}

async function turn(conv: Conversation, text: string) {
  const events: ChatEvent[] = [];
  const started = performance.now();
  const result = await runTurn(
    {
      sessionId: conv.sessionId,
      userText: text,
      history: toLlmHistory(conv.rows.slice(-HISTORY_LIMIT)),
      previousIntent: conv.intent,
      ctx: { sessionId: conv.sessionId, guestId: 'golden-eval' },
    },
    { llm, tools, emit: (e) => events.push(e), timeoutMs: env.GEMINI_TIMEOUT_MS },
  );
  const latencyMs = performance.now() - started;
  const row = (role: HistoryRow['role'], content: string): HistoryRow => ({
    role,
    content,
    toolName: null,
    toolArgs: null,
    toolResult: null,
  });
  conv.rows.push(
    row('user', text),
    ...result.toolCalls.map((c) => ({
      ...row('tool', ''),
      toolName: c.name,
      toolArgs: c.args,
      toolResult: c.response,
    })),
    row('assistant', result.assistantText),
  );
  conv.intent = result.intent;
  return { result, events, latencyMs };
}

function paramsOf(call: ToolCallRecord): { purpose?: unknown; budget?: number; preferences: Preferences } {
  const response = call.response as { purpose?: unknown; budget?: unknown };
  if (call.name === 'modify_build') {
    return {
      purpose: response.purpose,
      budget: toInt(response.budget),
      preferences: sanitizePreferences(call.args.preferenceChanges),
    };
  }
  return {
    purpose: call.args.purpose,
    budget: toInt(call.args.budget),
    preferences: sanitizePreferences(call.args.preferences, call.args.resolution),
  };
}

async function validateBuilds(ids: string[]): Promise<{ total: number; valid: number; problems: string[] }> {
  const builds = await buildsService.getMany(ids);
  const problems: string[] = [];
  let valid = 0;
  for (const b of builds) {
    const report = await compatibility.check(
      b.items.map((i) => i.product.id),
      { purpose: b.purpose, budget: b.budget },
    );
    const errors = report.issues.filter((i) => i.severity === 'error');
    if (errors.length === 0 && b.totalPrice <= b.budget) valid += 1;
    else problems.push(`${b.id}: ${errors.map((e) => e.code).join(',') || 'over budget'}`);
  }
  if (builds.length !== ids.length) problems.push(`${ids.length - builds.length} build id(s) not found`);
  return { total: ids.length, valid, problems };
}

async function evaluate(c: GoldenCase): Promise<CaseResult> {
  const conv: Conversation = { sessionId: randomUUID(), rows: [] };
  for (const text of c.setup ?? []) await turn(conv, text);
  const { result, events, latencyMs } = await turn(conv, c.prompt);
  const expect: Expectation = { ...c.expect, ...(llm ? {} : (c.fallbackExpect ?? {})) };
  const called = result.toolCalls.map((t) => t.name);
  const emittedBuilds = events.some((e) => e.type === 'builds' && e.builds.length > 0);
  const checks: Check[] = [];

  checks.push({
    name: 'tool',
    ok: expect.tool === null ? called.length === 0 : called.includes(expect.tool),
    detail: `expected ${expect.tool ?? 'none'}, called ${called.join('+') || 'none'}`,
  });

  const decisive = expect.tool ? result.toolCalls.find((t) => t.name === expect.tool && t.ok) : undefined;
  const params = decisive ? paramsOf(decisive) : undefined;
  if (expect.purpose !== undefined || expect.budget !== undefined) {
    const purposeOk = expect.purpose === undefined || params?.purpose === expect.purpose;
    const budgetOk =
      expect.budget === undefined ||
      (params?.budget !== undefined && Math.abs(params.budget - expect.budget) <= expect.budget * 0.05);
    checks.push({
      name: 'params',
      ok: Boolean(params) && purposeOk && budgetOk,
      detail: params
        ? `purpose ${String(params.purpose)}, budget ${params.budget === undefined ? '-' : formatVnd(params.budget)}`
        : 'no matching tool call',
    });
  }
  if (expect.preferences) {
    const got = params?.preferences ?? {};
    const wrong = Object.entries(expect.preferences).filter(
      ([k, v]) => (got as Record<string, unknown>)[k] !== v,
    );
    checks.push({
      name: 'preferences',
      ok: Boolean(params) && wrong.length === 0,
      detail: wrong.length ? `missing/wrong ${wrong.map(([k]) => k).join(', ')}` : 'ok',
    });
  }
  checks.push({
    name: 'builds',
    ok: emittedBuilds === expect.builds,
    detail: `expected ${expect.builds ? 'builds' : 'no builds'}, got ${emittedBuilds ? 'builds' : 'none'}`,
  });
  if (expect.question) {
    checks.push({
      name: 'question',
      ok: result.assistantText.includes('?') && !emittedBuilds,
      detail: result.assistantText.includes('?') ? 'asked' : 'no question in the reply',
    });
  }
  if (expect.infeasible) {
    const min = (decisive?.response as { minFeasibleBudget?: number } | undefined)?.minFeasibleBudget;
    checks.push({
      name: 'infeasible',
      ok: !emittedBuilds && min !== undefined && result.assistantText.includes(formatVnd(min)),
      detail: min === undefined ? 'no minFeasibleBudget' : `minimum ${formatVnd(min)} mentioned?`,
    });
  }
  const validation = await validateBuilds(result.buildIds);
  checks.push({
    name: 'valid',
    ok: validation.valid === validation.total,
    detail: validation.problems.join('; ') || `${validation.valid}/${validation.total}`,
  });

  return {
    c,
    expect,
    mode: result.mode,
    ...(result.fallbackReason && llm ? { fallbackReason: result.fallbackReason } : {}),
    tools: called,
    latencyMs,
    reply: result.assistantText,
    checks,
    builds: { total: validation.total, valid: validation.valid },
  };
}

const percentile = (sorted: number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
const pct = (ok: number, n: number) => (n === 0 ? 'n/a' : `${((ok / n) * 100).toFixed(1)}%`);
const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');

function metric(results: CaseResult[], name: Check['name']) {
  const applicable = results.flatMap((r) => r.checks.filter((c) => c.name === name));
  const ok = applicable.filter((c) => c.ok).length;
  return { ok, n: applicable.length, text: `${pct(ok, applicable.length)} (${ok}/${applicable.length})` };
}

function render(results: CaseResult[], meta: { modeLabel: string; cold: boolean; startedAt: Date }): string {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const totalBuilds = results.reduce((s, r) => s + r.builds.total, 0);
  const validBuilds = results.reduce((s, r) => s + r.builds.valid, 0);
  const passed = results.filter((r) => r.checks.every((c) => c.ok)).length;
  const modes = results.reduce<Record<string, number>>((m, r) => {
    m[r.mode] = (m[r.mode] ?? 0) + 1;
    return m;
  }, {});
  const categories = [...new Set(results.map((r) => r.c.category))];
  const lines = [
    '# AI Advisor golden-set evaluation',
    '',
    `- Run: ${meta.startedAt.toISOString()} (generated by \`pnpm --filter @pc/api eval:ai\`)`,
    `- Mode: **${meta.modeLabel}**`,
    `- Turn modes: ${Object.entries(modes)
      .map(([m, n]) => `${m} ${n}`)
      .join(', ')}`,
    `- Cases: ${results.length} (golden-set.json); real tools and engine on the dev database`,
    `- Recommendation cache: ${meta.cold ? 'cold (catalog version bumped before the run)' : 'warm'}`,
    '',
    '## Summary',
    '',
    '| Metric | Result |',
    '| --- | --- |',
    `| Tool-call accuracy | ${metric(results, 'tool').text} |`,
    `| Parameter accuracy (purpose exact, budget ±5%) | ${metric(results, 'params').text} |`,
    `| Preference accuracy (brand, colour, resolution, Wi-Fi, size) | ${metric(results, 'preferences').text} |`,
    `| Builds shown when expected (and only then) | ${metric(results, 'builds').text} |`,
    `| Valid builds (re-checked with checkCompatibility + budget) | ${pct(validBuilds, totalBuilds)} (${validBuilds}/${totalBuilds}) |`,
    `| Question asked when information is missing | ${metric(results, 'question').text} |`,
    `| Infeasible budget explained with the minimum | ${metric(results, 'infeasible').text} |`,
    `| Cases passing every check | ${pct(passed, results.length)} (${passed}/${results.length}) |`,
    `| Latency p50 / p95 / max (one turn, ms) | ${percentile(latencies, 50).toFixed(0)} / ${percentile(latencies, 95).toFixed(0)} / ${(latencies.at(-1) ?? 0).toFixed(0)} |`,
    '',
    '## By category',
    '',
    '| Category | Cases | Passing |',
    '| --- | --- | --- |',
    ...categories.map((cat) => {
      const rs = results.filter((r) => r.c.category === cat);
      const ok = rs.filter((r) => r.checks.every((c) => c.ok)).length;
      return `| ${cat} | ${rs.length} | ${ok} |`;
    }),
    '',
    '## Cases',
    '',
    '| ID | Prompt | Expected tool | Called | Params | Builds valid | Latency ms | Result |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...results.map((r) => {
      const failed = r.checks.filter((c) => !c.ok);
      const params = r.checks.find((c) => c.name === 'params');
      const prompt = [...(r.c.setup ?? []).map((s) => `${s} → `), r.c.prompt].join('');
      return `| ${r.c.id} | ${cell(prompt)} | ${r.expect.tool ?? '—'} | ${r.tools.join(', ') || '—'} | ${cell(params?.detail ?? '—')} | ${r.builds.valid}/${r.builds.total} | ${r.latencyMs.toFixed(0)} | ${failed.length === 0 ? 'pass' : `FAIL: ${cell(failed.map((f) => `${f.name} (${f.detail})`).join('; '))}`} |`;
    }),
    '',
    '## Notes',
    '',
    '- Tool-call accuracy: the expected tool appears among the calls of the measured turn (or no tool at all when a question is expected).',
    '- Parameters come from the first successful call of the expected tool (for modify_build: the budget and purpose it solved with).',
    '- Follow-up cases run their `setup` turns first in the same conversation; only the last turn is measured.',
    '- In fallback mode, `fallbackExpect` replaces the expected tool where the rule-based responder by design answers with recommend_builds (follow-ups) or a question (product search).',
    '- Every build id any measured turn returned is reloaded and re-checked with the engine rules C01–C14 and the budget; this must stay at 100%.',
  ];
  if (llmWarnings.length > 0) {
    lines.push('', '## LLM warnings', '', ...[...new Set(llmWarnings)].map((w) => `- ${cell(w)}`));
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const startedAt = new Date();
  const cold = !flag('warm');
  if (cold) await bumpCatalogVersion(redis);
  const modeLabel = llm ? `AI (Gemini ${env.GEMINI_MODEL})` : 'FALLBACK (rule-based NLU, no GEMINI_API_KEY)';
  console.log(`Golden set: ${cases.length} cases, mode ${modeLabel}`);
  const results: CaseResult[] = [];
  for (const [i, c] of cases.entries()) {
    if (i > 0 && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    const r = await evaluate(c);
    results.push(r);
    const failed = r.checks.filter((x) => !x.ok).map((x) => x.name);
    console.log(
      `${c.id.padEnd(4)} ${failed.length === 0 ? 'pass' : `FAIL ${failed.join(',')}`.padEnd(4)} ${r.mode.padEnd(8)} ${r.latencyMs.toFixed(0).padStart(6)} ms  ${c.prompt}`,
    );
  }
  const out = resolve(here, '..', arg('out') || 'eval/results.md');
  writeFileSync(out, render(results, { modeLabel, cold, startedAt }));
  const invalid = results.some((r) => r.builds.valid !== r.builds.total);
  console.log(`\nWrote ${out}${invalid ? ' — INVALID BUILDS FOUND' : ''}`);
  return invalid ? 1 : 0;
}

main()
  .then(async (code) => {
    await Promise.allSettled([sql.end(), redis.quit()]);
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await Promise.allSettled([sql.end(), redis.quit()]);
    process.exit(1);
  });
