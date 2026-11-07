import {
  type CompatibilityIssue,
  type CompatibilityReport,
  checkCompatibility,
  type EngineProduct,
  type PartMap,
} from '@pc/engine';
import type { CategoryKey, ProductDTO, Purpose } from '@pc/shared';

export type BuilderParts = Partial<Record<CategoryKey, ProductDTO>>;
export type Severity = 'error' | 'warning';

export interface BuilderContext {
  purpose: Purpose;
  budget?: number | null;
}

export function toEngineProduct(p: ProductDTO): EngineProduct {
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    brand: p.brand,
    price: p.salePrice ?? p.price,
    stock: p.stock,
    specs: p.specs,
    benchmark: p.benchmark ?? undefined,
    commercialBoost: p.commercialBoost,
  };
}

function toPartMap(parts: BuilderParts): PartMap {
  const map: PartMap = {};
  for (const [category, p] of Object.entries(parts) as [CategoryKey, ProductDTO | undefined][]) {
    if (p) map[category] = toEngineProduct(p);
  }
  return map;
}

/**
 * Client-side run of the engine rules. The CPU–GPU balance rule needs the whole catalogue for tiers,
 * so it only appears once the build is saved and checked by the server.
 */
export function buildReport(parts: BuilderParts, ctx: BuilderContext): CompatibilityReport {
  return checkCompatibility(toPartMap(parts), {
    purpose: ctx.purpose,
    budget: ctx.budget ?? undefined,
  });
}

/** Per-slot highlight. The budget rule names every part, so it stays in the summary only. */
export function slotSeverity(issues: readonly CompatibilityIssue[]): Partial<Record<CategoryKey, Severity>> {
  const out: Partial<Record<CategoryKey, Severity>> = {};
  for (const issue of issues) {
    if (issue.code === 'C14') continue;
    for (const category of issue.categories) {
      if (out[category] !== 'error') out[category] = issue.severity;
    }
  }
  return out;
}

export interface CandidateVerdict {
  status: 'ok' | Severity;
  issues: CompatibilityIssue[];
  overBudget: boolean;
}

/** Rules about a part that is simply not chosen yet: they must not dim candidates in the picker. */
const INCOMPLETE_BUILD_RULES = new Set(['C10', 'C14']);

/** What changes if `candidate` takes its slot: only issues that involve the candidate's own category. */
export function previewCandidate(
  parts: BuilderParts,
  candidate: ProductDTO,
  ctx: BuilderContext,
): CandidateVerdict {
  const report = buildReport({ ...parts, [candidate.category]: candidate }, ctx);
  const issues = report.issues
    .filter((i) => !INCOMPLETE_BUILD_RULES.has(i.code) && i.categories.includes(candidate.category))
    .sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
  const status = issues.some((i) => i.severity === 'error') ? 'error' : issues.length > 0 ? 'warning' : 'ok';
  const overBudget = report.issues.some((i) => i.code === 'C14' && i.severity === 'error');
  return { status, issues, overBudget };
}
