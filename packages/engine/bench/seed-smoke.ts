import { CATEGORY_KEYS, type CategoryKey, formatVnd, type GpuSpecs, type PsuSpecs } from '@pc/shared';
import { CATALOG } from '../../../apps/api/src/db/seed/data/catalog';
import { solve } from '../src/solver';
import type { EngineProduct, SolveRequest } from '../src/types';

/** Runs the engine on the real seed catalog. Usage: `pnpm --filter @pc/engine bench:seed`. */
const catalog: EngineProduct[] = CATEGORY_KEYS.flatMap((category: CategoryKey) =>
  CATALOG[category].map((p) => ({
    id: p.sku,
    category,
    name: p.name,
    brand: p.brand,
    price: p.salePrice ?? p.price,
    stock: p.stock,
    specs: p.specs,
    benchmark: p.benchmark,
    commercialBoost: p.commercialBoost,
  })),
);

const SCENARIOS: [string, SolveRequest][] = [
  ['gaming 15M', { budget: 15_000_000, purpose: 'gaming' }],
  ['gaming 25M', { budget: 25_000_000, purpose: 'gaming' }],
  ['gaming 40M', { budget: 40_000_000, purpose: 'gaming' }],
  ['gaming 60M', { budget: 60_000_000, purpose: 'gaming' }],
  [
    'gaming 25M AMD 1440p',
    { budget: 25_000_000, purpose: 'gaming', preferences: { cpuBrand: 'AMD', resolution: '1440p' } },
  ],
  ['graphics 40M', { budget: 40_000_000, purpose: 'graphics' }],
  ['ai 60M', { budget: 60_000_000, purpose: 'ai' }],
  ['office 10M', { budget: 10_000_000, purpose: 'office' }],
  ['office 12M', { budget: 12_000_000, purpose: 'office' }],
  ['gaming 5M dGPU', { budget: 5_000_000, purpose: 'gaming', preferences: { requireDiscreteGpu: true } }],
  [
    'gaming 30M white ITX',
    { budget: 30_000_000, purpose: 'gaming', preferences: { color: 'white', formFactor: 'ITX' } },
  ],
];

const out: string[] = [
  `catalog: ${catalog.length} products, ${catalog.filter((p) => p.stock > 0).length} in stock`,
];
for (const [name, req] of SCENARIOS) {
  const r = solve(req, catalog);
  out.push(
    `\n## ${name} — ${r.stats.timeMs.toFixed(1)} ms, ${r.stats.nodesExplored} nodes${r.infeasibleReason ? ` — ${r.infeasibleReason}` : ''}${r.minFeasibleBudget ? ` (min ${formatVnd(r.minFeasibleBudget)})` : ''}`,
  );
  for (const b of r.builds) {
    const gpu = b.parts.gpu ? `${(b.parts.gpu.specs as GpuSpecs).chipset}` : 'iGPU';
    const psu = b.parts.psu ? `${(b.parts.psu.specs as PsuSpecs).wattage}W` : '';
    out.push(
      `- ${b.label.padEnd(11)} ${formatVnd(b.totalPrice).padStart(12)} score ${b.score.toFixed(2).padStart(6)} | est ${b.estimatedWattage}W psu ${psu} | gpu ${gpu} | warnings ${b.warnings.map((w) => w.code).join(',') || '-'}`,
    );
    for (const c of CATEGORY_KEYS) {
      const p = b.parts[c];
      if (p) out.push(`    ${c.padEnd(9)} ${formatVnd(p.price).padStart(12)}  ${p.name}`);
    }
  }
}
process.stdout.write(`${out.join('\n')}\n`);
