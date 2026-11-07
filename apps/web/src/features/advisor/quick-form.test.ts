import { type InfeasibleReason, recommendationRequestSchema } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  BUDGET_MAX_M,
  BUDGET_MIN_M,
  infeasibleNotice,
  isCacheHit,
  parseBudgetMillions,
  QUICK_FORM_DEFAULTS,
  type QuickFormValues,
  quickFormError,
  sliderBudget,
  validateQuickForm,
} from './quick-form';

const values = (patch: Partial<QuickFormValues> = {}): QuickFormValues => ({
  ...QUICK_FORM_DEFAULTS,
  ...patch,
});

describe('parseBudgetMillions', () => {
  it('reads whole and decimal millions with a dot or a comma', () => {
    expect(parseBudgetMillions('25')).toBe(25);
    expect(parseBudgetMillions(' 25,5 ')).toBe(25.5);
    expect(parseBudgetMillions('7.5')).toBe(7.5);
  });

  it('returns null for empty or non-numeric text', () => {
    expect(parseBudgetMillions('')).toBeNull();
    expect(parseBudgetMillions('hai lăm')).toBeNull();
    expect(parseBudgetMillions('25tr')).toBeNull();
  });
});

describe('validateQuickForm', () => {
  it('maps the defaults to a budget in VND and a purpose, without preferences', () => {
    const r = validateQuickForm(values());
    expect(r).toEqual({ ok: true, request: { budget: 25_000_000, purpose: 'gaming' } });
  });

  it('sends only the preferences the user picked', () => {
    const r = validateQuickForm(
      values({
        budget: '32,5',
        purpose: 'graphics',
        cpuBrand: 'AMD',
        gpuBrand: 'NVIDIA',
        color: 'white',
        formFactor: 'mATX',
        resolution: '1440p',
        needWifi: true,
      }),
    );
    expect(r).toEqual({
      ok: true,
      request: {
        budget: 32_500_000,
        purpose: 'graphics',
        preferences: {
          cpuBrand: 'AMD',
          gpuBrand: 'NVIDIA',
          color: 'white',
          formFactor: 'mATX',
          resolution: '1440p',
          needWifi: true,
        },
      },
    });
  });

  it('leaves out an unticked Wi-Fi box and "any" choices', () => {
    const r = validateQuickForm(values({ purpose: 'office', gpuBrand: '', needWifi: false, color: 'black' }));
    expect(r).toEqual({
      ok: true,
      request: { budget: 25_000_000, purpose: 'office', preferences: { color: 'black' } },
    });
  });

  it('produces requests the API schema accepts at both budget limits', () => {
    for (const budget of [String(BUDGET_MIN_M), String(BUDGET_MAX_M), '12,345678']) {
      const r = validateQuickForm(values({ budget, cpuBrand: 'Intel', needWifi: true }));
      expect(r.ok, budget).toBe(true);
      if (r.ok) expect(recommendationRequestSchema.safeParse(r.request).success, budget).toBe(true);
    }
  });

  it('rejects budgets outside 5–200 million or not a number, in Vietnamese', () => {
    for (const budget of ['4', '200,5', '', 'abc']) {
      const r = validateQuickForm(values({ budget }));
      expect(r.ok, budget).toBe(false);
      if (!r.ok) expect(r.errors.budget).toBe('Nhập ngân sách từ 5 đến 200 triệu');
    }
  });
});

describe('sliderBudget', () => {
  it('keeps the slider inside its range while the text field is being edited', () => {
    expect(sliderBudget('25')).toBe(25);
    expect(sliderBudget('2')).toBe(BUDGET_MIN_M);
    expect(sliderBudget('999')).toBe(BUDGET_MAX_M);
    expect(sliderBudget('')).toBe(25);
  });
});

describe('infeasibleNotice', () => {
  it('explains a budget that is too low and offers the cheapest feasible budget, rounded up', () => {
    const n = infeasibleNotice({
      builds: [],
      infeasibleReason: 'BUDGET_TOO_LOW',
      minFeasibleBudget: 7_250_000,
    });
    expect(n?.title).toBe('Ngân sách chưa đủ cho một bộ máy tương thích');
    expect(n?.body).toContain('7.250.000');
    expect(n?.body).toContain('₫');
    expect(n?.suggestBudget).toBe(8);
  });

  it('does not offer a budget above the form maximum', () => {
    const n = infeasibleNotice({
      builds: [],
      infeasibleReason: 'BUDGET_TOO_LOW',
      minFeasibleBudget: 250_000_000,
    });
    expect(n?.suggestBudget).toBeNull();
  });

  it('asks to relax preferences when no combination fits', () => {
    const n = infeasibleNotice({ builds: [], infeasibleReason: 'NO_COMPATIBLE_COMBINATION' });
    expect(n?.title).toBe('Không có bộ linh kiện còn hàng khớp mọi yêu cầu');
    expect(n?.body).toMatch(/bỏ bớt/);
    expect(n?.suggestBudget).toBeNull();
  });

  it('covers the search limit, a fixed-part conflict and unknown reasons', () => {
    expect(infeasibleNotice({ builds: [], infeasibleReason: 'SEARCH_LIMIT' })?.body).toMatch(/thử lại/i);
    expect(infeasibleNotice({ builds: [], infeasibleReason: 'FIXED_PART_CONFLICT' })?.title).toBeTruthy();
    // A newer server may add a reason before the web knows it.
    const unknown = 'SOMETHING_NEW' as unknown as InfeasibleReason;
    expect(infeasibleNotice({ builds: [], infeasibleReason: unknown })?.title).toBe(
      'Chưa tìm được cấu hình phù hợp',
    );
    expect(infeasibleNotice({ builds: [] })?.title).toBe('Chưa tìm được cấu hình phù hợp');
  });

  it('is null when there are builds', () => {
    // biome-ignore lint/suspicious/noExplicitAny: only the length matters here
    expect(infeasibleNotice({ builds: [{} as any] })).toBeNull();
  });
});

describe('quickFormError', () => {
  it('turns 429 RATE_LIMITED into a wait-and-retry message', () => {
    expect(quickFormError(new ApiError(429, 'RATE_LIMITED', 'Too many'))).toBe(
      'Bạn gửi yêu cầu gợi ý hơi nhanh. Chờ khoảng một phút rồi bấm lại nhé.',
    );
  });

  it('keeps the server’s Vietnamese message for other API errors and explains network failures', () => {
    expect(quickFormError(new ApiError(400, 'VALIDATION_ERROR', 'Ngân sách không hợp lệ'))).toBe(
      'Ngân sách không hợp lệ',
    );
    expect(quickFormError(new TypeError('Failed to fetch'))).toBe(
      'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    );
  });
});

describe('isCacheHit', () => {
  it('reads the X-Cache header', () => {
    expect(isCacheHit(new Headers({ 'X-Cache': 'HIT' }))).toBe(true);
    expect(isCacheHit(new Headers({ 'X-Cache': 'MISS' }))).toBe(false);
    expect(isCacheHit(new Headers())).toBe(false);
  });
});
