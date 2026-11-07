import {
  type FormFactor,
  type GpuBrand,
  MAX_BUDGET,
  MIN_BUDGET,
  type Preferences,
  type Purpose,
  type RecommendationRequest,
  type RecommendationResultDTO,
} from '@pc/shared';
import { ApiError } from '@/lib/api';
import { formatVnd } from '@/lib/format';

const MILLION = 1_000_000;
export const BUDGET_MIN_M = MIN_BUDGET / MILLION;
export const BUDGET_MAX_M = MAX_BUDGET / MILLION;

type Any = '';

/** Form state; `''` means "Bất kỳ". The budget stays text so "25," can be typed. */
export interface QuickFormValues {
  budget: string;
  purpose: Purpose;
  cpuBrand: NonNullable<Preferences['cpuBrand']> | Any;
  gpuBrand: GpuBrand | Any;
  color: NonNullable<Preferences['color']> | Any;
  formFactor: FormFactor | Any;
  resolution: NonNullable<Preferences['resolution']> | Any;
  needWifi: boolean;
}

export const QUICK_FORM_DEFAULTS: QuickFormValues = {
  budget: '25',
  purpose: 'gaming',
  cpuBrand: '',
  gpuBrand: '',
  color: '',
  formFactor: '',
  resolution: '',
  needWifi: false,
};

const DEFAULT_BUDGET_M = Number(QUICK_FORM_DEFAULTS.budget);
const BUDGET_ERROR = `Nhập ngân sách từ ${BUDGET_MIN_M} đến ${BUDGET_MAX_M} triệu`;

/** Millions of VND, with a dot or comma decimal: "25", "25,5". */
export function parseBudgetMillions(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Slider position for whatever is in the text box, kept inside the slider's range. */
export function sliderBudget(text: string): number {
  const m = parseBudgetMillions(text);
  if (m === null) return DEFAULT_BUDGET_M;
  return Math.min(BUDGET_MAX_M, Math.max(BUDGET_MIN_M, m));
}

export type QuickFormResult =
  | { ok: true; request: RecommendationRequest }
  | { ok: false; errors: { budget?: string } };

export function validateQuickForm(values: QuickFormValues): QuickFormResult {
  const millions = parseBudgetMillions(values.budget);
  const budget = millions === null ? Number.NaN : Math.round(millions * MILLION);
  if (!(budget >= MIN_BUDGET && budget <= MAX_BUDGET)) return { ok: false, errors: { budget: BUDGET_ERROR } };

  const preferences: Preferences = {};
  if (values.cpuBrand) preferences.cpuBrand = values.cpuBrand;
  if (values.gpuBrand) preferences.gpuBrand = values.gpuBrand;
  if (values.color) preferences.color = values.color;
  if (values.formFactor) preferences.formFactor = values.formFactor;
  if (values.resolution) preferences.resolution = values.resolution;
  if (values.needWifi) preferences.needWifi = true;

  const request: RecommendationRequest = { budget, purpose: values.purpose };
  if (Object.keys(preferences).length > 0) request.preferences = preferences;
  return { ok: true, request };
}

export interface InfeasibleNotice {
  title: string;
  body: string;
  /** Whole millions to retry with, or null when there is nothing sensible to offer. */
  suggestBudget: number | null;
}

/** What to say when the engine returns no build, keyed by its infeasible reason. */
export function infeasibleNotice(
  result: Pick<RecommendationResultDTO, 'builds' | 'infeasibleReason' | 'minFeasibleBudget'>,
): InfeasibleNotice | null {
  if (result.builds.length > 0) return null;
  switch (result.infeasibleReason) {
    case 'BUDGET_TOO_LOW': {
      const min = result.minFeasibleBudget;
      const suggest = min === undefined ? null : Math.ceil(min / MILLION);
      return {
        title: 'Ngân sách chưa đủ cho một bộ máy tương thích',
        body:
          min === undefined
            ? 'Bộ linh kiện tương thích rẻ nhất đang còn hàng vượt ngân sách này. Thử tăng ngân sách.'
            : `Bộ linh kiện tương thích rẻ nhất đang còn hàng có giá ${formatVnd(min)}.`,
        suggestBudget: suggest !== null && suggest <= BUDGET_MAX_M ? Math.max(suggest, BUDGET_MIN_M) : null,
      };
    }
    case 'NO_COMPATIBLE_COMBINATION':
      return {
        title: 'Không có bộ linh kiện còn hàng khớp mọi yêu cầu',
        body: 'Thử bỏ bớt ưu tiên (hãng CPU/GPU, màu, kích thước mainboard, Wi-Fi) hoặc tăng ngân sách.',
        suggestBudget: null,
      };
    case 'FIXED_PART_CONFLICT':
      return {
        title: 'Linh kiện được giữ nguyên không lắp chung được',
        body: 'Một linh kiện cố định không tương thích với hàng còn trong kho. Bỏ bớt ưu tiên rồi thử lại.',
        suggestBudget: null,
      };
    case 'SEARCH_LIMIT':
      return {
        title: 'Tìm cấu hình mất quá nhiều thời gian',
        body: 'Hệ thống đã tạm dừng để không bắt bạn chờ. Thử lại sau giây lát hoặc bỏ bớt ưu tiên.',
        suggestBudget: null,
      };
    default:
      return {
        title: 'Chưa tìm được cấu hình phù hợp',
        body: 'Thử đổi mục đích, bỏ bớt ưu tiên hoặc tăng ngân sách.',
        suggestBudget: null,
      };
  }
}

export function quickFormError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Bạn gửi yêu cầu gợi ý hơi nhanh. Chờ khoảng một phút rồi bấm lại nhé.';
    return err.message || 'Máy chủ chưa xử lý được yêu cầu. Thử lại sau ít giây.';
  }
  return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
}

export const isCacheHit = (headers: Headers) => headers.get('X-Cache') === 'HIT';
