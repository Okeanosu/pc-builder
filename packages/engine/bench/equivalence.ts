import type { Purpose } from '@pc/shared';
import { solve } from '../src/solver';
import type { SolveRequest, SolveResult } from '../src/types';
import { syntheticCatalog } from '../test/fixtures/synthetic';

/**
 * Randomized check that branch & bound (`full`) returns exactly the labelled builds and diagnoses of exhaustive
 * forward checking. Usage: `pnpm --filter @pc/engine bench:equivalence [catalogSize] [seeds]`.
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

let checked = 0;
let withThreeBuilds = 0;
let skippedCapped = 0;
let mismatches = 0;
for (let seed = 100; seed < 100 + seeds; seed++) {
  const catalog = syntheticCatalog(size, seed);
  for (const purpose of ['gaming', 'graphics', 'ai', 'office'] as Purpose[]) {
    for (const budget of [12e6, 22e6, 38e6]) {
      const requests: SolveRequest[] = [
        { budget, purpose },
        { budget, purpose, preferences: { color: 'white', resolution: '4k' } },
      ];
      for (const req of requests) {
        const full = solve(req, catalog);
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
  `${JSON.stringify({ size, seeds, checked, withThreeBuilds, skippedCapped, mismatches })}\n`,
);
process.exitCode = mismatches === 0 ? 0 : 1;
