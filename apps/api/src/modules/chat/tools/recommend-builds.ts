import type { CategoryKey, RecommendationRequest } from '@pc/shared';
import { TOOL_DECLARATIONS } from './declarations';
import { type RunRecommendationDeps, runRecommendation } from './recommendation-runner';
import { clampBudget, sanitizePreferences, toInt, toolError, toPurpose, toStringList } from './shared';
import type { ChatTool } from './types';

export interface ProductRef {
  id: string;
  category: CategoryKey;
  name: string;
  stock: number;
}

export interface RecommendBuildsDeps extends RunRecommendationDeps {
  getProduct(id: string): Promise<ProductRef | null>;
}

export const declOf = (name: string) => {
  const decl = TOOL_DECLARATIONS.find((d) => d.name === name);
  if (!decl) throw new Error(`missing tool declaration ${name}`);
  return decl;
};

/** mustIncludeProductIds → `fixed` by category; unknown ids are reported back instead of failing the call. */
async function resolveMustInclude(
  ids: string[],
  getProduct: RecommendBuildsDeps['getProduct'],
): Promise<{ fixed: Partial<Record<CategoryKey, string>>; unknown: string[] }> {
  const fixed: Partial<Record<CategoryKey, string>> = {};
  const unknown: string[] = [];
  for (const id of ids) {
    const p = await getProduct(id);
    if (p) fixed[p.category] = p.id;
    else unknown.push(id);
  }
  return { fixed, unknown };
}

export function createRecommendBuildsTool(deps: RecommendBuildsDeps): ChatTool {
  return {
    decl: declOf('recommend_builds'),
    label: 'Đang tìm cấu hình tối ưu',
    async run(args, ctx) {
      const budget = toInt(args.budget);
      const purpose = toPurpose(args.purpose);
      if (budget === undefined) {
        return {
          forModel: toolError('INVALID_ARGUMENTS', 'Thiếu ngân sách; hãy hỏi khách ngân sách dự kiến.'),
        };
      }
      if (!purpose) {
        return {
          forModel: toolError(
            'INVALID_ARGUMENTS',
            'Thiếu hoặc sai mục đích sử dụng (gaming, graphics, ai, office); hãy hỏi khách.',
          ),
        };
      }

      const clamped = clampBudget(budget);
      const exclude = toStringList(args.excludeProductIds);
      const { fixed, unknown } = await resolveMustInclude(
        toStringList(args.mustIncludeProductIds),
        deps.getProduct,
      );
      const req: RecommendationRequest = {
        budget: clamped.budget,
        purpose,
        preferences: sanitizePreferences(args.preferences, args.resolution),
        ...(Object.keys(fixed).length > 0 ? { fixed } : {}),
        ...(exclude.length > 0 ? { exclude } : {}),
      };
      const unknownNote =
        unknown.length > 0 ? `Bỏ qua ID sản phẩm không tồn tại: ${unknown.join(', ')}.` : undefined;
      const { result } = await runRecommendation(deps, req, ctx, [clamped.note, unknownNote]);
      return result;
    },
  };
}
