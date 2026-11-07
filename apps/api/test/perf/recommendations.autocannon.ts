/**
 * Load test of POST /api/recommendations with autocannon (30 s per scenario by default).
 *
 *   miss-c1 / miss-c10: every request has a different (purpose, budget, preferences) tuple, so the
 *     recommendation cache never hits: each one runs the full engine solve and stores 3 builds.
 *   hit-c10: one identical request (gaming 25M) repeated, so all but the first are cache hits.
 *
 * The API limits recommendations to 20/min per client (gid cookie, else IP). Each request carries its own
 * random `gid` cookie, so every request is a "new guest" and the limiter never trips; the 429 count is
 * still reported to prove it. Usage (API already running, see perf-env.ts): `pnpm perf` from the root,
 * or `pnpm exec tsx test/perf/recommendations.autocannon.ts [seconds]` from apps/api.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { type Preferences, PURPOSES } from '@pc/shared';
import autocannon, { type RequestParams } from 'autocannon';
import { API_URL, assertApiUp, bumpCatalogVersion, environment, percentile, round1 } from './perf-env';

const DURATION = Number(process.argv[2] ?? process.env.PERF_DURATION ?? 30);
const origin = new URL(API_URL).origin;
const path = `${new URL(API_URL).pathname}/recommendations`;

const PREFERENCE_VARIANTS: (Preferences | undefined)[] = [
  undefined,
  { gpuBrand: 'NVIDIA' },
  { cpuBrand: 'AMD' },
  { color: 'white' },
  { needWifi: true },
];

let counter = 0;
function variedBody(): string {
  const i = counter++;
  const purpose = PURPOSES[i % PURPOSES.length]!;
  // 12M..72M in 10k steps: unique per purpose for the first 24,000 requests.
  const budget = 12_000_000 + (Math.floor(i / PURPOSES.length) % 6000) * 10_000;
  const preferences = PREFERENCE_VARIANTS[i % PREFERENCE_VARIANTS.length];
  return JSON.stringify(preferences ? { budget, purpose, preferences } : { budget, purpose });
}

const FIXED_BODY = JSON.stringify({ budget: 25_000_000, purpose: 'gaming' });

interface ScenarioResult {
  name: string;
  connections: number;
  durationS: number;
  requests: number;
  rps: number;
  latencyMs: { p50: number; p95: number; p99: number; max: number; mean: number };
  engineMs: { p50: number; p95: number; p99: number };
  status: Record<string, number>;
  xCache: Record<string, number>;
  errors: number;
  timeouts: number;
}

async function scenario(name: string, connections: number, body: () => string): Promise<ScenarioResult> {
  const latencies: number[] = [];
  const engine: number[] = [];
  const xCache: Record<string, number> = {};
  const instance = autocannon({
    url: origin,
    connections,
    duration: DURATION,
    timeout: 30,
    requests: [
      {
        method: 'POST',
        path,
        setupRequest: (req: RequestParams) => ({
          ...req,
          headers: {
            'content-type': 'application/json',
            cookie: `gid=perf${randomBytes(9).toString('base64url')}`,
          },
          body: body(),
        }),
        onResponse: (status, resBody, _ctx, headers) => {
          const cache = headers['x-cache'] ?? headers['X-Cache'] ?? `status ${status}`;
          xCache[cache] = (xCache[cache] ?? 0) + 1;
          if (status !== 200) return;
          const timeMs = (JSON.parse(resBody) as { stats?: { timeMs?: number } }).stats?.timeMs;
          if (typeof timeMs === 'number') engine.push(timeMs);
        },
      },
    ],
  });
  instance.on('response', (_client: unknown, _status: number, _bytes: number, responseTime: number) => {
    latencies.push(responseTime);
  });
  const r = await instance;
  const status = Object.fromEntries(Object.entries(r.statusCodeStats).map(([k, v]) => [k, v.count]));
  return {
    name,
    connections,
    durationS: DURATION,
    requests: latencies.length,
    rps: round1(latencies.length / DURATION),
    latencyMs: {
      p50: round1(percentile(latencies, 50)),
      p95: round1(percentile(latencies, 95)),
      p99: round1(percentile(latencies, 99)),
      max: round1(Math.max(...latencies)),
      mean: round1(latencies.reduce((s, x) => s + x, 0) / latencies.length),
    },
    engineMs: {
      p50: round1(percentile(engine, 50)),
      p95: round1(percentile(engine, 95)),
      p99: round1(percentile(engine, 99)),
    },
    status,
    xCache,
    errors: r.errors,
    timeouts: r.timeouts,
  };
}

function table(results: ScenarioResult[]): string {
  const rows = results.map((r) =>
    [
      r.name,
      r.connections,
      r.requests,
      r.rps,
      r.latencyMs.p50,
      r.latencyMs.p95,
      r.latencyMs.p99,
      r.latencyMs.max,
      `${r.engineMs.p50} / ${r.engineMs.p95}`,
      Object.entries(r.status)
        .map(([k, v]) => `${k}×${v}`)
        .join(' '),
      Object.entries(r.xCache)
        .map(([k, v]) => `${k}×${v}`)
        .join(' '),
      r.errors + r.timeouts,
    ].join(' | '),
  );
  return [
    '| Scenario | conn | requests | req/s | p50 ms | p95 ms | p99 ms | max ms | engine p50 / p95 ms | status | X-Cache | errors+timeouts |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |',
    ...rows.map((r) => `| ${r} |`),
  ].join('\n');
}

await assertApiUp();
const env = environment();
const results: ScenarioResult[] = [];

await bumpCatalogVersion();
results.push(await scenario('miss-c1 (cache off: varied requests)', 1, variedBody));
await bumpCatalogVersion();
results.push(await scenario('miss-c10 (cache off: varied requests)', 10, variedBody));
await bumpCatalogVersion();
results.push(await scenario('hit-c10 (identical request, cached)', 10, () => FIXED_BODY));

const md = `# POST /api/recommendations — autocannon

Generated by \`apps/api/test/perf/recommendations.autocannon.ts\` on ${env.date}.

- Machine: ${env.cpu} (${env.cores} cores, ${env.memoryGB} GB) · ${env.os} · Node ${env.node}
- ${env.postgres} · ${env.redis} (Docker), API in development mode with pino request logging on, fallback AI mode
- 1-minute load average when the run started: ${env.loadAvg1m} (other processes were running on the machine)
- ${DURATION} s per scenario; latency = autocannon response time per request (client side, includes HTTP,
  Redis, Postgres and the engine); percentiles are nearest-rank over every response, not histogram buckets.
- "engine" = \`stats.timeMs\` reported by the solver inside the response (cache hits repeat the cached value).
- Each request sends a fresh random \`gid\` cookie, so the 20 req/min/client limiter never applies.

${table(results)}

\`\`\`json
${JSON.stringify({ env, results }, null, 2)}
\`\`\`
`;
writeFileSync(new URL('./results.md', import.meta.url), md);
console.log(table(results));
