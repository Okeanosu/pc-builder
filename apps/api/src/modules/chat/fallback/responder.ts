import {
  BUILD_LABEL_TEXT,
  CATEGORY_LABELS,
  type CategoryKey,
  type ChatEvent,
  formatVnd,
  formatVndShort,
  MAX_BUDGET,
  MIN_BUDGET,
  PURPOSES,
  type Purpose,
  preferencesSchema,
} from '@pc/shared';
import { executeTool, type ToolCallRecord } from '../tools/execute';
import type { RecommendToolOutput, ToolContext, ToolRegistry } from '../tools/types';
import { foldVietnamese, type ParsedIntent, parseIntent } from './nlu';

const PURPOSE_PHRASE: Record<Purpose, string> = {
  gaming: 'chơi game',
  graphics: 'đồ họa, dựng phim',
  ai: 'lập trình và AI',
  office: 'văn phòng, học tập',
};

const adjustHint = (intent?: ParsedIntent) =>
  `nhắn "rẻ hơn", "mạnh hơn" hoặc "đổi card ${intent?.preferences.gpuBrand === 'AMD' ? 'NVIDIA' : 'AMD'}" để em điều chỉnh nhé.`;

export const FALLBACK_TEXT = {
  askBoth:
    'Chào anh/chị! Em là trợ lý tư vấn cấu hình PC. Anh/chị cho em biết ngân sách dự kiến và mục đích chính ' +
    '(chơi game, đồ họa/dựng phim, lập trình/AI hay văn phòng) để em gợi ý cấu hình phù hợp nhé?',
  askBudget: (purpose: Purpose) =>
    `Anh/chị dự kiến ngân sách khoảng bao nhiêu cho bộ máy ${PURPOSE_PHRASE[purpose]} ạ? (ví dụ: "25 triệu")`,
  askPurpose: (budget: number) =>
    `Với ngân sách ${formatVnd(budget)}, anh/chị dùng máy chủ yếu để làm gì ạ: chơi game, đồ họa/dựng phim, lập trình/AI hay văn phòng?`,
  belowMinimum: (budget: number) =>
    `Ngân sách ${formatVnd(budget)} hơi thấp để lắp một bộ PC hoàn chỉnh, tối thiểu khoảng ${formatVnd(MIN_BUDGET)}. ` +
    'Anh/chị có thể nâng ngân sách lên không ạ?',
  unavailable:
    'Xin lỗi anh/chị, hệ thống gợi ý cấu hình đang tạm gián đoạn. Anh/chị thử lại sau ít phút giúp em nhé.',
  thanks: (intent?: ParsedIntent) => `Dạ, em cảm ơn anh/chị! Anh/chị có thể ${adjustHint(intent)}`,
  help: (intent?: ParsedIntent) =>
    'Em đang ở chế độ tư vấn tự động nên chỉ hiểu các yêu cầu về cấu hình. ' +
    `Anh/chị cho em biết ngân sách hoặc mục đích mới, hoặc ${adjustHint(intent)}`,
};

export function isRecommendOutput(x: unknown): x is RecommendToolOutput {
  return typeof x === 'object' && x !== null && Array.isArray((x as { builds?: unknown }).builds);
}

/** Overlays the arguments the model passed to recommend_builds onto a parsed intent. */
export function mergeRecommendArgs(intent: ParsedIntent, args: Record<string, unknown>): ParsedIntent {
  const merged: ParsedIntent = { ...intent, preferences: { ...intent.preferences } };
  if (typeof args.budget === 'number' && Number.isFinite(args.budget)) {
    merged.budget = Math.round(args.budget);
    delete merged.budgetRange;
  }
  if (PURPOSES.includes(args.purpose as Purpose)) merged.purpose = args.purpose as Purpose;
  const prefs = preferencesSchema.safeParse({
    ...(typeof args.preferences === 'object' && args.preferences !== null ? args.preferences : {}),
    ...(typeof args.resolution === 'string' ? { resolution: args.resolution } : {}),
  });
  if (prefs.success) Object.assign(merged.preferences, prefs.data);
  return merged;
}

/**
 * Intent after a modify_build the model ran: previous budget + budgetDelta and previous preferences + changes.
 * The NLU's own guesses (e.g. a toggled GPU brand) are not used because the model, not the parser, chose the edit.
 */
export function mergeModifyArgs(
  parsed: ParsedIntent,
  previous: ParsedIntent | undefined,
  args: Record<string, unknown>,
): ParsedIntent {
  const delta =
    typeof args.budgetDelta === 'number' && Number.isFinite(args.budgetDelta) ? args.budgetDelta : 0;
  const changes = preferencesSchema.safeParse(
    typeof args.preferenceChanges === 'object' && args.preferenceChanges !== null
      ? args.preferenceChanges
      : {},
  );
  const merged: ParsedIntent = {
    preferences: { ...(previous?.preferences ?? {}), ...(changes.success ? changes.data : {}) },
  };
  if (previous?.budget !== undefined) {
    merged.budget = Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Math.round(previous.budget + delta)));
  }
  if (parsed.purpose) merged.purpose = parsed.purpose;
  return merged;
}

function recommendArgs(intent: ParsedIntent & { budget: number; purpose: Purpose }): Record<string, unknown> {
  const { resolution } = intent.preferences;
  return {
    budget: intent.budget,
    purpose: intent.purpose,
    ...(resolution ? { resolution } : {}),
    preferences: intent.preferences,
  };
}

const categoryLabel = (key: string) => CATEGORY_LABELS[key as CategoryKey] ?? key;
const percent = (share: number) => `${Math.round(share * 100)}%`;

const purposeSuffix = (intent: ParsedIntent) => (intent.purpose ? ` ${PURPOSE_PHRASE[intent.purpose]}` : '');

function headline(intent: ParsedIntent, count: number, adjusted: boolean): string {
  const { budget } = intent;
  const what = `${count} cấu hình${purposeSuffix(intent)}`;
  const within = budget !== undefined ? ` trong ngân sách ${formatVnd(budget)}` : '';
  if (adjusted) return `Em đã điều chỉnh theo yêu cầu, đây là ${what}${within}:`;
  switch (intent.wantsChange) {
    case 'cheaper':
      return budget !== undefined
        ? `Em đã hạ ngân sách xuống ${formatVnd(budget)}, đây là ${what} mới:`
        : `Em đã điều chỉnh cho rẻ hơn, đây là ${what} mới:`;
    case 'stronger':
      return budget !== undefined
        ? `Em đã nâng ngân sách lên ${formatVnd(budget)} để mạnh hơn, đây là ${what} mới:`
        : `Em đã điều chỉnh cho mạnh hơn, đây là ${what} mới:`;
    case 'swap-gpu-brand':
      if (intent.preferences.gpuBrand) {
        return `Em đã đổi sang card ${intent.preferences.gpuBrand}, đây là ${what}${within}:`;
      }
      break;
    case 'swap-cpu-brand':
      if (intent.preferences.cpuBrand) {
        return `Em đã đổi sang CPU ${intent.preferences.cpuBrand}, đây là ${what}${within}:`;
      }
      break;
  }
  return `Em gợi ý ${what}${within}:`;
}

function describeBuild(build: RecommendToolOutput['builds'][number], index: number): string {
  const label = BUILD_LABEL_TEXT[build.label] ?? build.label;
  const top = Object.entries(build.allocation ?? {})
    .filter(([, share]) => typeof share === 'number' && share > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, share]) => `${categoryLabel(key)} (${percent(share)})`);
  const parts = build.parts ?? [];
  const cpu = parts.find((p) => p.category === 'cpu');
  const gpu = parts.find((p) => p.category === 'gpu');
  const details = [
    top.length > 0 ? `dồn ngân sách nhiều nhất cho ${top.join(' và ')}` : undefined,
    cpu ? `CPU ${cpu.name}` : undefined,
    gpu ? `card ${gpu.name}` : cpu ? 'dùng đồ họa tích hợp' : undefined,
  ].filter(Boolean);
  const line = `${index + 1}. ${label} — ${formatVnd(build.totalPrice)}${details.length ? `: ${details.join('; ')}` : ''}.`;
  const warnings = (build.warnings ?? []).filter(Boolean);
  return warnings.length > 0 ? `${line}\n   Lưu ý: ${warnings.join('; ')}.` : line;
}

/** Templated Vietnamese explanation built only from engine output, so names and prices are always real. */
export function explainRecommendation(
  output: RecommendToolOutput,
  intent: ParsedIntent,
  opts: { adjusted?: boolean } = {},
): string {
  if (output.builds.length === 0) {
    const withBudget = intent.budget !== undefined ? `với ngân sách ${formatVnd(intent.budget)} ` : '';
    const lines = [
      `Rất tiếc, ${withBudget}em chưa tìm được cấu hình${purposeSuffix(intent)} nào tương thích và còn hàng.`,
    ];
    if (output.infeasibleReason) lines.push(`Lý do: ${output.infeasibleReason}.`);
    if (output.minFeasibleBudget) {
      lines.push(
        `Ngân sách tối thiểu khả thi khoảng ${formatVnd(output.minFeasibleBudget)}. ` +
          `Anh/chị nhắn "${formatVndShort(output.minFeasibleBudget)}" để em gợi ý lại nhé.`,
      );
    } else {
      lines.push('Anh/chị thử nâng ngân sách hoặc bớt yêu cầu về hãng, màu, kích thước giúp em nhé.');
    }
    return lines.join('\n');
  }
  return [
    headline(intent, output.builds.length, opts.adjusted ?? false),
    '',
    ...output.builds.map(describeBuild),
    '',
    `Chi tiết linh kiện và giá có trong các thẻ cấu hình bên dưới. Anh/chị có thể ${adjustHint(intent)}`,
  ].join('\n');
}

export interface FallbackInput {
  userText: string;
  previousIntent?: ParsedIntent;
  ctx: ToolContext;
  /** A recommendation the AI path already produced this turn; explained instead of re-running the engine. */
  prior?: {
    output: RecommendToolOutput;
    args: Record<string, unknown>;
    source: 'recommend_builds' | 'modify_build';
  };
}

export interface FallbackDeps {
  tools: ToolRegistry;
  emit: (e: ChatEvent) => void;
}

export interface FallbackReply {
  text: string;
  intent: ParsedIntent;
  buildIds: string[];
  toolCalls: ToolCallRecord[];
}

function mentionsSomething(text: string): boolean {
  const own = parseIntent(text);
  return (
    own.budget !== undefined ||
    own.purpose !== undefined ||
    own.wantsChange !== undefined ||
    Object.keys(own.preferences).length > 0
  );
}

/** Rule-based answer for one turn: ask for what is missing, otherwise run recommend_builds and explain it. */
export async function respondFallback(input: FallbackInput, deps: FallbackDeps): Promise<FallbackReply> {
  const parsed = parseIntent(input.userText, input.previousIntent);
  const reply = (text: string, intent = parsed): FallbackReply => ({
    text,
    intent,
    buildIds: [],
    toolCalls: [],
  });

  if (input.prior) {
    const adjusted = input.prior.source === 'modify_build';
    const intent = adjusted
      ? mergeModifyArgs(parsed, input.previousIntent, input.prior.args)
      : mergeRecommendArgs(parsed, input.prior.args);
    return reply(explainRecommendation(input.prior.output, intent, { adjusted }), intent);
  }

  const { budget, purpose } = parsed;
  const wasComplete =
    input.previousIntent?.budget !== undefined && input.previousIntent.purpose !== undefined;
  if (wasComplete && !mentionsSomething(input.userText)) {
    const thanks = /\b(cam on|thank|thanks|tks|ok|oke|okay)\b/.test(
      foldVietnamese(input.userText.toLowerCase()),
    );
    return reply(thanks ? FALLBACK_TEXT.thanks(parsed) : FALLBACK_TEXT.help(parsed));
  }
  if (budget === undefined && purpose === undefined) return reply(FALLBACK_TEXT.askBoth);
  if (budget === undefined) return reply(FALLBACK_TEXT.askBudget(purpose as Purpose));
  if (purpose === undefined) return reply(FALLBACK_TEXT.askPurpose(budget));
  if (budget < MIN_BUDGET) return reply(FALLBACK_TEXT.belowMinimum(budget));

  const { record, result } = await executeTool(
    deps.tools,
    'recommend_builds',
    recommendArgs({ ...parsed, budget, purpose }),
    input.ctx,
    deps.emit,
  );
  if (!record.ok || !isRecommendOutput(record.response)) {
    return { text: FALLBACK_TEXT.unavailable, intent: parsed, buildIds: [], toolCalls: [record] };
  }
  return {
    text: explainRecommendation(record.response, parsed),
    intent: parsed,
    buildIds: result?.buildIds ?? [],
    toolCalls: [record],
  };
}
