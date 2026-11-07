import {
  type BuildDTO,
  CATEGORY_KEYS,
  type CategoryKey,
  type Preferences,
  type RecommendationRequest,
} from '@pc/shared';
import { declOf, type ProductRef } from './recommend-builds';
import {
  type RunRecommendationDeps,
  runRecommendation,
  type StoredBuildRequest,
} from './recommendation-runner';
import { categoryLabel, clampBudget, sanitizePreferences, toCategory, toInt, toolError } from './shared';
import type { ChatTool } from './types';

/** Categories the solver must be free to change when a preference changes. */
const PREFERENCE_CATEGORIES: Record<keyof Preferences, CategoryKey[]> = {
  cpuBrand: ['cpu', 'mainboard'],
  gpuBrand: ['gpu'],
  color: ['ram', 'case', 'cooler'],
  formFactor: ['mainboard', 'case'],
  minRamGB: ['ram'],
  minStorageGB: ['storage'],
  needWifi: ['mainboard'],
  resolution: ['gpu'],
  requireDiscreteGpu: ['gpu'],
};

/** Parts whose compatibility usually depends on a changed part (socket, memory type, length, wattage, size). */
const DEPENDENTS: Record<CategoryKey, CategoryKey[]> = {
  cpu: ['mainboard', 'cooler', 'ram'],
  mainboard: ['cpu', 'ram', 'case'],
  ram: ['mainboard'],
  gpu: ['psu', 'case'],
  storage: ['mainboard'],
  psu: ['case'],
  case: ['mainboard', 'gpu', 'cooler', 'psu'],
  cooler: ['case'],
};

const inOrder = (set: Set<CategoryKey>) => CATEGORY_KEYS.filter((c) => set.has(c));

export interface ModificationAttempt {
  request: RecommendationRequest;
  /** Categories the solver may change, in category order. */
  released: CategoryKey[];
}

export type ModificationPlan =
  | (ModificationAttempt & { ok: true; fullResolve: boolean; relaxed?: ModificationAttempt; notes: string[] })
  | { ok: false; error: ReturnType<typeof toolError> };

export interface ModificationInput {
  build: BuildDTO;
  /** Request the build was solved from (budget, purpose, preferences), when still remembered. */
  base: StoredBuildRequest | null;
  args: Record<string, unknown>;
  /** The looked-up `args.newProductId`; null when it does not exist. */
  newProduct?: ProductRef | null;
}

const fail = (error: string, message: string): ModificationPlan => ({
  ok: false,
  error: toolError(error, message),
});

/**
 * Turns a modify_build call into a recommendation request: every current part stays fixed except the categories
 * being changed; a replaced category without a chosen product excludes the current part so the solver picks
 * another. A budget-only change re-solves the whole build. `relaxed` additionally frees dependent categories, for a
 * retry when keeping them makes the request infeasible.
 */
export function planModification({ build, base, args, newProduct }: ModificationInput): ModificationPlan {
  const replaceCategory = toCategory(args.replaceCategory);
  if (args.replaceCategory !== undefined && !replaceCategory) {
    return fail('INVALID_ARGUMENTS', `Danh mục "${String(args.replaceCategory)}" không hợp lệ.`);
  }
  if (args.newProductId !== undefined) {
    if (!newProduct) return fail('NOT_FOUND', 'Không tìm thấy sản phẩm thay thế với ID này.');
    if (replaceCategory && newProduct.category !== replaceCategory) {
      return fail(
        'CATEGORY_MISMATCH',
        `Sản phẩm "${newProduct.name}" thuộc danh mục ${categoryLabel(newProduct.category)}, ` +
          `không phải ${categoryLabel(replaceCategory)}.`,
      );
    }
    if (newProduct.stock <= 0) {
      return fail('OUT_OF_STOCK', `Sản phẩm "${newProduct.name}" đã hết hàng; hãy đề xuất sản phẩm khác.`);
    }
  }

  const delta = toInt(args.budgetDelta) ?? 0;
  const changes = sanitizePreferences(args.preferenceChanges);
  const released = new Set<CategoryKey>();
  if (replaceCategory) released.add(replaceCategory);
  if (newProduct) released.add(newProduct.category);
  for (const key of Object.keys(changes) as Array<keyof Preferences>) {
    for (const c of PREFERENCE_CATEGORIES[key]) released.add(c);
  }
  const fullResolve = released.size === 0;
  if (fullResolve) {
    if (delta === 0) {
      return fail(
        'NO_CHANGES',
        'Cần ít nhất một thay đổi: replaceCategory, newProductId, budgetDelta hoặc preferenceChanges.',
      );
    }
    for (const c of CATEGORY_KEYS) released.add(c);
  }

  const budget = clampBudget(build.budget + delta);
  const preferences: Preferences = { ...(base?.preferences ?? {}), ...changes };
  const current = new Map(build.items.map((i) => [i.category, i.product.id]));
  const exclude = replaceCategory && !newProduct ? current.get(replaceCategory) : undefined;

  const attempt = (free: Set<CategoryKey>): ModificationAttempt => {
    const fixed: Partial<Record<CategoryKey, string>> = {};
    for (const [category, id] of current) if (!free.has(category)) fixed[category] = id;
    if (newProduct) fixed[newProduct.category] = newProduct.id;
    return {
      released: inOrder(free),
      request: {
        budget: budget.budget,
        purpose: build.purpose,
        preferences,
        ...(Object.keys(fixed).length > 0 ? { fixed } : {}),
        ...(exclude ? { exclude: [exclude] } : {}),
      },
    };
  };

  const strict = attempt(released);
  const wider = new Set(released);
  for (const c of released) for (const d of DEPENDENTS[c]) wider.add(d);
  const relaxed = wider.size > released.size ? attempt(wider) : undefined;
  return {
    ok: true,
    ...strict,
    fullResolve,
    ...(relaxed ? { relaxed } : {}),
    notes: budget.note ? [budget.note] : [],
  };
}

export interface ModifyBuildDeps extends RunRecommendationDeps {
  getBuild(id: string): Promise<BuildDTO | null>;
  getProduct(id: string): Promise<ProductRef | null>;
}

const labels = (cs: CategoryKey[]) => cs.map(categoryLabel);

/** Models sometimes send optional fields as "" or null; treat those as absent. */
function withoutBlanks(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      if (value.trim() !== '') out[key] = value.trim();
    } else out[key] = value;
  }
  return out;
}

export function createModifyBuildTool(deps: ModifyBuildDeps): ChatTool {
  return {
    decl: declOf('modify_build'),
    label: 'Đang điều chỉnh cấu hình',
    async run(rawArgs, ctx) {
      const args = withoutBlanks(rawArgs);
      const buildId = typeof args.buildId === 'string' ? args.buildId.trim() : '';
      if (!buildId) {
        return { forModel: toolError('INVALID_ARGUMENTS', 'Thiếu buildId của cấu hình cần chỉnh.') };
      }
      const build = await deps.getBuild(buildId);
      if (!build) {
        return {
          forModel: toolError(
            'NOT_FOUND',
            'Không tìm thấy cấu hình này; hãy dùng đúng buildId từ kết quả gợi ý trước đó.',
          ),
        };
      }
      if (args.newProductId !== undefined && typeof args.newProductId !== 'string') delete args.newProductId;
      const newProduct =
        typeof args.newProductId === 'string' ? await deps.getProduct(args.newProductId) : undefined;
      const plan = planModification({ build, base: await deps.requests.get(buildId), args, newProduct });
      if (!plan.ok) return { forModel: plan.error };

      const fullNote = plan.fullResolve ? 'Đã tối ưu lại toàn bộ cấu hình theo ngân sách mới.' : undefined;
      const strict = await runRecommendation(deps, plan.request, ctx, [...plan.notes, fullNote], {
        ...(plan.fullResolve ? {} : { changedCategories: labels(plan.released) }),
      });
      const retry =
        strict.outcome.builds.length === 0 &&
        plan.relaxed &&
        strict.outcome.infeasibleReason !== 'SEARCH_LIMIT';
      if (!retry || !plan.relaxed) return strict.result;

      const extra = plan.relaxed.released.filter((c) => !plan.released.includes(c));
      const relaxedNote =
        `Để các linh kiện tương thích, hệ thống đã phải đổi thêm: ${labels(extra).join(', ')}; ` +
        'hãy nói rõ điều này với khách.';
      const relaxed = await runRecommendation(deps, plan.relaxed.request, ctx, plan.notes, {
        changedCategories: labels(plan.relaxed.released),
      });
      if (relaxed.outcome.builds.length === 0) return relaxed.result;
      const forModel = relaxed.result.forModel;
      forModel.note = [forModel.note, relaxedNote].filter(Boolean).join(' ');
      return relaxed.result;
    },
  };
}
