'use client';

import {
  type BuildDTO,
  FORM_FACTORS,
  GPU_BRANDS,
  PURPOSE_LABELS,
  PURPOSES,
  type Purpose,
  type RecommendationRequest,
  type RecommendationResultDTO,
} from '@pc/shared';
import { useMutation } from '@tanstack/react-query';
import {
  BrainCircuit,
  BriefcaseBusiness,
  CircleCheck,
  DatabaseZap,
  Gamepad2,
  OctagonX,
  Palette,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiWithHeaders } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import {
  BUDGET_MAX_M,
  BUDGET_MIN_M,
  infeasibleNotice,
  isCacheHit,
  parseBudgetMillions,
  type QuickFormValues,
  quickFormError,
  sliderBudget,
  validateQuickForm,
} from './quick-form';

const PURPOSE_ICON: Record<Purpose, typeof Gamepad2> = {
  gaming: Gamepad2,
  graphics: Palette,
  ai: BrainCircuit,
  office: BriefcaseBusiness,
};

const ANY = 'any';
const anyOption = { value: ANY, label: 'Bất kỳ' };
const CPU_OPTIONS = [anyOption, { value: 'AMD', label: 'AMD' }, { value: 'Intel', label: 'Intel' }];
const GPU_OPTIONS = [anyOption, ...GPU_BRANDS.map((b) => ({ value: b, label: b }))];
const COLOR_OPTIONS = [anyOption, { value: 'black', label: 'Đen' }, { value: 'white', label: 'Trắng' }];
const FORM_FACTOR_LABEL: Record<(typeof FORM_FACTORS)[number], string> = {
  ATX: 'ATX (thùng lớn)',
  mATX: 'mATX (thùng vừa)',
  ITX: 'ITX (nhỏ gọn)',
};
const FORM_FACTOR_OPTIONS = [
  anyOption,
  ...FORM_FACTORS.map((f) => ({ value: f, label: FORM_FACTOR_LABEL[f] })),
];
const RESOLUTION_OPTIONS = [
  anyOption,
  { value: '1080p', label: 'Full HD (1080p)' },
  { value: '1440p', label: '2K (1440p)' },
  { value: '4k', label: '4K' },
];

export interface QuickOutcome {
  result: RecommendationResultDTO;
  cacheHit: boolean;
}

const defaultSelection = (builds: readonly BuildDTO[]) =>
  (builds.find((b) => b.label === 'balanced') ?? builds[0])?.id ?? null;

/** The form's request/response state, owned by the workspace so the compare panel can show the builds. */
export function useQuickRecommend(onSuccess?: (outcome: QuickOutcome) => void) {
  const [outcome, setOutcome] = useState<QuickOutcome | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (request: RecommendationRequest) =>
      apiWithHeaders<RecommendationResultDTO>('/recommendations', { method: 'POST', json: request }),
    onSuccess: ({ data, headers }) => {
      const next = { result: data, cacheHit: isCacheHit(headers) };
      setOutcome(next);
      setSelectedId(defaultSelection(data.builds));
      onSuccess?.(next);
    },
  });
  /** Validates and sends; returns the field errors when the form cannot be sent. */
  const send = (values: QuickFormValues): { budget?: string } | null => {
    const result = validateQuickForm(values);
    if (!result.ok) return result.errors;
    mutation.mutate(result.request);
    return null;
  };
  return {
    outcome,
    selectedId,
    select: setSelectedId,
    send,
    pending: mutation.isPending,
    error: mutation.error ? quickFormError(mutation.error) : null,
  };
}

export type QuickRecommend = ReturnType<typeof useQuickRecommend>;

function PurposePicker({ value, onChange }: { value: Purpose; onChange: (p: Purpose) => void }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 text-sm font-medium text-fg">Mục đích sử dụng</legend>
      <div className="grid grid-cols-2 gap-2">
        {PURPOSES.map((p) => {
          const Icon = PURPOSE_ICON[p];
          const checked = value === p;
          return (
            <label
              key={p}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                checked
                  ? 'border-accent bg-accent/12 text-fg'
                  : 'border-border-strong bg-surface text-muted hover:border-fg/50 hover:text-fg',
              )}
            >
              <input
                type="radio"
                name="purpose"
                value={p}
                checked={checked}
                onChange={() => onChange(p)}
                className="sr-only"
              />
              <Icon
                className={cn('size-4 shrink-0', checked ? 'text-accent-ink' : 'text-muted')}
                aria-hidden
              />
              <span className="font-medium">{PURPOSE_LABELS[p]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** One line under the submit button; scrolled into view because the button sits at the panel's bottom edge. */
function ResultStatus({ quick }: { quick: QuickRecommend }) {
  const { outcome, error, pending } = quick;
  const ref = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reveal the line whenever a new result or error lands
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, [outcome, error]);

  let content: ReactNode = null;
  if (pending) content = null;
  else if (error) {
    content = (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-fg"
      >
        <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
        <span>{error}</span>
      </div>
    );
  } else if (outcome && infeasibleNotice(outcome.result)) {
    content = (
      <p className="flex items-center gap-2 text-sm text-warn-ink" role="status">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        Chưa có cấu hình phù hợp. Xem gợi ý ở khung so sánh.
      </p>
    );
  } else if (outcome) {
    content = (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted" role="status">
        <CircleCheck className="size-4 text-ok-ink" aria-hidden />
        Đã chọn {outcome.result.builds.length} cấu hình tương thích từ hàng trong kho
        {outcome.cacheHit && <CacheChip />}
      </p>
    );
  }
  return <div ref={ref}>{content}</div>;
}

export function CacheChip() {
  return (
    <Badge
      tone="neutral"
      size="sm"
      title="Kết quả giống hệt lần hỏi trước nên lấy lại ngay, giá vẫn theo kho"
    >
      <DatabaseZap aria-hidden />
      từ bộ nhớ đệm
    </Badge>
  );
}

/** Replaces the empty compare panel when the engine found no build. */
export function InfeasiblePanel({
  outcome,
  onUseBudget,
}: {
  outcome: QuickOutcome;
  onUseBudget: (millions: number) => void;
}) {
  const notice = infeasibleNotice(outcome.result);
  if (!notice) return null;
  const suggest = notice.suggestBudget;
  return (
    <div
      role="status"
      className="flex flex-col gap-4 rounded-lg border border-warn/45 bg-warn/10 p-5 text-sm text-fg"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn-ink" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{notice.title}</p>
          <p className="text-muted">{notice.body}</p>
        </div>
      </div>
      {suggest !== null && (
        <Button size="sm" className="self-start" onClick={() => onUseBudget(suggest)}>
          Thử với {suggest} triệu
        </Button>
      )}
    </div>
  );
}

export function QuickRecommendForm({
  quick,
  values,
  onChange,
}: {
  quick: QuickRecommend;
  values: QuickFormValues;
  onChange: (next: QuickFormValues) => void;
}) {
  const [budgetError, setBudgetError] = useState<string | undefined>();
  const set = <K extends keyof QuickFormValues>(key: K, value: QuickFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const pick =
    <K extends 'cpuBrand' | 'gpuBrand' | 'color' | 'formFactor' | 'resolution'>(key: K) =>
    (v: string) =>
      set(key, (v === ANY ? '' : v) as QuickFormValues[K]);
  const setBudget = (text: string) => {
    set('budget', text);
    if (budgetError) setBudgetError(undefined);
  };

  const millions = parseBudgetMillions(values.budget);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBudgetError(quick.send(values)?.budget);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent-ink">
          <Sparkles className="size-3.5" aria-hidden />
          Gợi ý nhanh
        </span>
        <h2 className="text-xl font-bold text-fg">Ngân sách và mục đích, nhận 3 cấu hình</h2>
        <p className="max-w-prose text-sm text-muted">
          Chọn từ hàng còn trong kho, đã kiểm tra tương thích. Không cần gõ câu hỏi.
        </p>
      </div>

      <Field
        label="Ngân sách"
        required
        error={budgetError}
        hint={
          millions !== null
            ? `${formatVnd(Math.round(millions * 1_000_000))} · từ ${BUDGET_MIN_M} đến ${BUDGET_MAX_M} triệu`
            : `Từ ${BUDGET_MIN_M} đến ${BUDGET_MAX_M} triệu`
        }
      >
        <div className="flex items-center gap-4">
          <Input
            name="budget"
            mono
            inputMode="decimal"
            autoComplete="off"
            value={values.budget}
            onChange={(e) => setBudget(e.target.value)}
            trailing="triệu"
            wrapperClassName="w-32 shrink-0"
          />
          <input
            type="range"
            min={BUDGET_MIN_M}
            max={BUDGET_MAX_M}
            step={1}
            value={sliderBudget(values.budget)}
            onChange={(e) => setBudget(e.target.value)}
            aria-label="Kéo để chọn ngân sách (triệu đồng)"
            aria-valuetext={`${sliderBudget(values.budget)} triệu đồng`}
            className="h-10 min-w-0 flex-1 accent-accent"
          />
        </div>
      </Field>

      <PurposePicker value={values.purpose} onChange={(p) => set('purpose', p)} />

      <fieldset className="flex flex-col">
        <legend className="mb-2 text-sm font-medium text-fg">
          Ưu tiên <span className="font-normal text-muted">(không bắt buộc)</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hãng CPU">
            <Select value={values.cpuBrand || ANY} onValueChange={pick('cpuBrand')} options={CPU_OPTIONS} />
          </Field>
          <Field label="Hãng card đồ họa">
            <Select value={values.gpuBrand || ANY} onValueChange={pick('gpuBrand')} options={GPU_OPTIONS} />
          </Field>
          <Field label="Màu linh kiện">
            <Select value={values.color || ANY} onValueChange={pick('color')} options={COLOR_OPTIONS} />
          </Field>
          <Field label="Kích thước mainboard">
            <Select
              value={values.formFactor || ANY}
              onValueChange={pick('formFactor')}
              options={FORM_FACTOR_OPTIONS}
            />
          </Field>
          <Field label="Độ phân giải màn hình">
            <Select
              value={values.resolution || ANY}
              onValueChange={pick('resolution')}
              options={RESOLUTION_OPTIONS}
            />
          </Field>
          <div className="flex items-end pb-2.5">
            <Checkbox
              label="Cần Wi-Fi trên mainboard"
              checked={values.needWifi}
              onCheckedChange={(c) => set('needWifi', c === true)}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" loading={quick.pending}>
          {!quick.pending && <Sparkles aria-hidden />}
          Gợi ý cấu hình
        </Button>
        <ResultStatus quick={quick} />
      </div>
    </form>
  );
}
