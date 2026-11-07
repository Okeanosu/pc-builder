import type { Purpose } from '@pc/shared';
import { solve } from '../src/solver';
import type { SolveRequest, SolveResult } from '../src/types';
import { syntheticCatalog } from '../test/fixtures/synthetic';

/**
 * Randomized check that `full` returns exactly the labelled builds and diagnoses of exhaustive forward checking, and
 * that every result honours the label contract. Usage: `pnpm --filter @pc/engine bench:equivalence [size] [seeds]`.
 */
const size = Number(process.argv[2] ?? 48);
const seeds = Number(process.argv[3] ?? 30);
const signature = (r: SolveResult) =>
  JSON.stringify([
    r.infeasibleReason,
    r.minFeasibleBudget,
    r.builds.map((b) => [
      b.label,
      b.score,
      b.totalPrice,
      Object.values(b.parts)
        .map((p) => p!.id)
        .sort(),
    ]),
  ]);

function contractViolation(r: SolveResult): string | null {
  const by = Object.fromEntries(r.builds.map((b) => [b.label, b]));
  const perf = by.performance;
  if (!perf) return r.builds.length > 0 ? 'missing performance' : null;
  if (r.builds.some((b) => b.score > perf.score)) return 'performance is not the best score';
  if (by.balanced && by.balanced.totalPrice > perf.totalPrice) return 'balanced costs more than performance';
  if (by.budget && by.budget.totalPrice > perf.totalPrice) return 'budget costs more than performance';
  if (by.budget && by.balanced && by.budget.totalPrice > by.balanced.totalPrice)
    return 'budget costs more than balanced';
  if (by.budget && by.budget.score < 0.85 * perf.score - 0.01) return 'budget below 85% of the best';
  return null;
}

let checked = 0;
let withThreeBuilds = 0;
let skippedCapped = 0;
let mismatches = 0;
let violations = 0;
for (let seed = 100; seed < 100 + seeds; seed++) {
  const catalog = syntheticCatalog(size, seed);
  const someCpu = catalog.find((p) => p.category === 'cpu' && p.stock > 0)?.id;
  for (const purpose of ['gaming', 'graphics', 'ai', 'office'] as Purpose[]) {
    for (const budget of [12e6, 22e6, 38e6]) {
      const requests: SolveRequest[] = [
        { budget, purpose },
        { budget, purpose, preferences: { color: 'white', resolution: '4k' } },
        ...(someCpu ? [{ budget, purpose, fixed: { cpu: someCpu } }] : []),
      ];
      for (const req of requests) {
        const full = solve(req, catalog);
        const violation = contractViolation(full);
        if (violation) {
          violations++;
          process.stdout.write(`CONTRACT seed=${seed} ${JSON.stringify(req)}: ${violation}\n`);
        }
        const exhaustive = solve({ ...req, strategy: 'forward-checking' }, catalog);
        if (exhaustive.stats.capped) {
          skippedCapped++;
          continue;
        }
        checked++;
        if (full.builds.length === 3) withThreeBuilds++;
        if (signature(full) !== signature(exhaustive)) {
          mismatches++;
          process.stdout.write(`MISMATCH seed=${seed} ${JSON.stringify(req)}\n`);
        }
      }
    }
  }
}
process.stdout.write(
  `${JSON.stringify({ size, seeds, checked, withThreeBuilds, skippedCapped, mismatches, contractViolations: violations })}\n`,
);
process.exitCode = mismatches === 0 && violations === 0 ? 0 : 1;
