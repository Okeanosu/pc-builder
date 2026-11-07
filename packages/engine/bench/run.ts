import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY_KEYS } from '@pc/shared';
import { buildProblem } from '../src/domains';
import { DEFAULT_PROFILES } from '../src/profiles';
import type { VariableOrder } from '../src/search';
import { solveWithOptions } from '../src/solver';
import type { EngineProduct, SolveRequest, SolveResult, SolveStrategy } from '../src/types';
import { syntheticCatalog } from '../test/fixtures/synthetic';

const SIZES = [50, 100, 250, 500];
const SEED = 7;
const NODE_LIMIT = 2_000_000;
const STRATEGIES: SolveStrategy[] = ['bruteforce', 'backtracking', 'forward-checking', 'full'];
const SCENARIOS: SolveRequest[] = [
  { budget: 20_000_000, purpose: 'office' },
  { budget: 25_000_000, purpose: 'gaming' },
  { budget: 40_000_000, purpose: 'graphics' },
  { budget: 60_000_000, purpose: 'ai' },
];
/** Measured repetitions per scenario (after one warm-up run). */
const REPS: Record<'full' | 'exhaustive' | 'ablation', number> = { full: 25, exhaustive: 3, ablation: 3 };

interface Sample {
  ms: number;
  result: SolveResult;
}

const here = dirname(fileURLToPath(import.meta.url));
const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]!;
const fmt = (x: number, digits = 1) => x.toLocaleString('en-US', { maximumFractionDigits: digits });
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const duration = (ms: number) => {
  const units: [number, string][] = [
    [365 * 86_400_000, 'years'],
    [86_400_000, 'days'],
    [3_600_000, 'h'],
    [60_000, 'min'],
    [1000, 's'],
  ];
  for (const [size, unit] of units) if (ms >= size) return `≈ ${fmt(ms / size, 1)} ${unit}`;
  return `≈ ${fmt(ms, 0)} ms`;
};

function measure(
  catalog: EngineProduct[],
  req: SolveRequest,
  reps: number,
  variableOrder: VariableOrder = 'weighted',
): Sample[] {
  const req2 = { ...req, nodeLimit: NODE_LIMIT };
  solveWithOptions(req2, catalog, undefined, { variableOrder });
  const samples: Sample[] = [];
  for (let i = 0; i < reps; i++) {
    const t = performance.now();
    const result = solveWithOptions(req2, catalog, undefined, { variableOrder });
    samples.push({ ms: performance.now() - t, result });
  }
  return samples;
}

function summarize(
  samples: Sample[],
  optimum: Map<SolveRequest, number | undefined>,
  scenarioOf: SolveRequest[],
) {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const capped = samples.filter((s) => s.result.stats.capped).length;
  const optimal = samples.filter((s, i) => s.result.builds[0]?.score === optimum.get(scenarioOf[i]!)).length;
  return {
    runs: samples.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    nodes: mean(samples.map((s) => s.result.stats.nodesExplored)),
    capped,
    optimal,
  };
}

function searchSpace(catalog: EngineProduct[], req: SolveRequest) {
  const problem = buildProblem(req, catalog, DEFAULT_PROFILES[req.purpose]);
  const sizes = problem.items.map((list) => list.length);
  return { sizes, product: sizes.reduce((a, b) => a * b, 1) };
}

const mainRows: string[] = [];
const csvRows: string[] = ['size,in_stock,strategy,runs,p50_ms,p95_ms,mean_nodes,capped_runs,optimal_runs'];
const spaceRows: string[] = [];
const pruneRows: string[] = [];
const ablationRows: string[] = [];
const scenarioRows: string[] = [];
let target = '';

for (const size of SIZES) {
  const catalog = syntheticCatalog(size, SEED);
  const inStock = catalog.filter((p) => p.stock > 0).length;
  const optimum = new Map<SolveRequest, number | undefined>();
  const fullSamples: Sample[] = [];
  const fullScenarioOf: SolveRequest[] = [];
  for (const req of SCENARIOS) {
    const samples = measure(catalog, req, REPS.full);
    optimum.set(req, samples[0]!.result.builds[0]?.score);
    fullSamples.push(...samples);
    fullScenarioOf.push(...samples.map(() => req));
    const r = samples[0]!.result;
    scenarioRows.push(
      `| ${size} | ${req.purpose} ${fmt(req.budget / 1e6, 0)}M | ${r.builds.length} | ${r.builds.map((b) => fmt(b.totalPrice / 1e6, 2)).join(' / ') || '—'} | ${r.builds.map((b) => fmt(b.score, 2)).join(' / ') || '—'} | ${r.infeasibleReason ?? ''} |`,
    );
  }

  for (const strategy of STRATEGIES) {
    let samples: Sample[];
    let scenarioOf: SolveRequest[];
    if (strategy === 'full') {
      samples = fullSamples;
      scenarioOf = fullScenarioOf;
    } else {
      samples = [];
      scenarioOf = [];
      for (const req of SCENARIOS) {
        const s = measure(catalog, { ...req, strategy }, REPS.exhaustive);
        samples.push(...s);
        scenarioOf.push(...s.map(() => req));
      }
    }
    const row = summarize(samples, optimum, scenarioOf);
    const mark = row.capped > 0 ? ` (capped ${row.capped}/${row.runs})` : '';
    mainRows.push(
      `| ${size} (${inStock}) | ${strategy} | ${fmt(row.p50, 2)} | ${fmt(row.p95, 2)} | ${fmt(row.nodes, 0)}${row.capped > 0 ? '†' : ''} | ${row.optimal}/${row.runs}${mark} |`,
    );
    csvRows.push(
      [
        size,
        inStock,
        strategy,
        row.runs,
        row.p50.toFixed(3),
        row.p95.toFixed(3),
        row.nodes.toFixed(0),
        row.capped,
        row.optimal,
      ].join(','),
    );
    if (strategy === 'full' && size === 250) {
      target = `full p95 on the 250-product catalog: **${fmt(row.p95, 2)} ms** (target < 300 ms) → ${row.p95 < 300 ? 'PASS' : 'FAIL'}`;
    }
    if (strategy === 'bruteforce') {
      const rate = mean(samples.map((s) => s.result.stats.nodesExplored / Math.max(s.ms, 1e-3)));
      const space = searchSpace(catalog, SCENARIOS[1]!);
      spaceRows.push(
        `| ${size} (${inStock}) | ${space.sizes.join(' × ')} | ${space.product.toExponential(2)} | ${fmt(rate, 0)} | ${duration(space.product / rate)} |`,
      );
    }
  }

  const avg = (
    k: 'prunedByDominance' | 'prunedByAc3' | 'prunedByForwardChecking' | 'prunedByBound' | 'nodesExplored',
  ) => fmt(mean(fullSamples.map((s) => s.result.stats[k] ?? 0)), 0);
  pruneRows.push(
    `| ${size} (${inStock}) | ${avg('prunedByDominance')} | ${avg('prunedByAc3')} | ${avg('prunedByForwardChecking')} | ${avg('prunedByBound')} | ${avg('nodesExplored')} |`,
  );

  for (const order of ['mrv', 'weighted'] as VariableOrder[]) {
    const samples: Sample[] = [];
    const scenarioOf: SolveRequest[] = [];
    for (const req of SCENARIOS) {
      const s = measure(catalog, req, REPS.ablation, order);
      samples.push(...s);
      scenarioOf.push(...s.map(() => req));
    }
    const row = summarize(samples, optimum, scenarioOf);
    ablationRows.push(
      `| ${size} (${inStock}) | ${order} | ${fmt(row.p50, 2)} | ${fmt(row.p95, 2)} | ${fmt(row.nodes, 0)} | ${row.capped}/${row.runs} |`,
    );
  }
  process.stdout.write(`size ${size} done\n`);
}

const md = `# Engine benchmark

Generated by \`pnpm --filter @pc/engine bench\` (\`bench/run.ts\`). Synthetic catalogs from a seeded PRNG
(\`syntheticCatalog(size, ${SEED})\`, category mix of the seed data, ~10% out of stock); the size column shows
total (in-stock) products. Workload per catalog: ${SCENARIOS.map((s) => `${s.purpose} ${s.budget / 1e6}M`).join(', ')}.
Each scenario is run once for warm-up, then ${REPS.full}× for \`full\` and ${REPS.exhaustive}× for the exhaustive
strategies; times are wall-clock per \`solve()\` call (domain building + search + label selection + build output).
Node limit: ${NODE_LIMIT.toLocaleString('en-US')} search nodes per call.

- Machine: ${cpus()[0]?.model ?? 'unknown CPU'} · Node ${process.version} · ${new Date().toISOString().slice(0, 10)}
- ${target}
- † = at least one run hit the node limit (\`stats.capped\`): the strategy stopped early, so its time is bounded by
  the cap and its builds may be sub-optimal. "optimal" counts runs whose best build has the same score as \`full\`.

## Strategies × catalog size

| Catalog | Strategy | p50 ms | p95 ms | mean nodes | optimal |
| --- | --- | ---: | ---: | ---: | --- |
${mainRows.join('\n')}

## Brute-force search space (gaming 25M domains, incl. "no GPU" where allowed)

| Catalog | domain sizes (cpu × mainboard × ram × gpu × storage × psu × case × cooler) | ∏ | brute-force nodes/ms | full enumeration at that rate |
| --- | --- | ---: | ---: | ---: |
${spaceRows.join('\n')}

## Pruning breakdown of \`full\` (mean per solve, all ${SCENARIOS.length} scenarios)

| Catalog | dominance | AC-3 | forward checking | bound | nodes |
| --- | ---: | ---: | ---: | ---: | ---: |
${pruneRows.join('\n')}

## Ablation: variable ordering inside \`full\`

\`mrv\` = smallest domain first; \`weighted\` (default) = singleton domains first, then categories by descending
purpose weight. ${REPS.ablation} runs per scenario.

| Catalog | order | p50 ms | p95 ms | mean nodes | capped |
| --- | --- | ---: | ---: | ---: | --- |
${ablationRows.join('\n')}

## Recommended builds (\`full\`) per scenario

| Catalog | scenario | builds | total price (triệu ₫) perf / balanced / budget | score | infeasible |
| --- | --- | ---: | --- | --- | --- |
${scenarioRows.join('\n')}

Category order of the domain sizes: ${CATEGORY_KEYS.join(', ')}.
`;

writeFileSync(join(here, 'results.md'), md);
writeFileSync(join(here, 'results.csv'), `${csvRows.join('\n')}\n`);
process.stdout.write(`${target}\nwrote bench/results.md and bench/results.csv\n`);
