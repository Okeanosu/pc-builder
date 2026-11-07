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
import { type FormEvent, useState } from 'react';
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
  return {
    outcome,
    selectedId,
    select: setSelectedId,
    submit: mutation.mutate,
    pending: mutation.isPending,
    error: mutation.error ? quickFormError(mutation.error) : null,
  };
}

export type QuickRecommend = ReturnType<typeof useQuickRecommend>;

function PurposePicker({ value, onChange }: { value: Purpose; onChange: (p: Purpose) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-fg">Mục đích sử dụng</legend>
      <div className="grid grid-cols-2 gap-2">
        {PURPOSES.map((p) => {
          const Icon = PURPOSE_ICON[p];
          const checked = value === p;
          return (
            <label
              key={p}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
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

function ResultStatus({
  quick,
  onUseBudget,
}: {
  quick: QuickRecommend;
  onUseBudget: (millions: number) => void;
}) {
  const { outcome, error, pending } = quick;
  if (pending) return null;
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-fg"
      >
        <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
        <span>{error}</span>
      </div>
    );
  }
  if (!outcome) return null;
  if (infeasibleNotice(outcome.result))
    return <InfeasiblePanel outcome={outcome} onUseBudget={onUseBudget} />;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted" role="status">
      <CircleCheck className="size-4 text-ok-ink" aria-hidden />
      Đã chọn {outcome.result.builds.length} cấu hình tương thích từ hàng trong kho
      {outcome.cacheHit && <CacheChip />}
    </p>
  );
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

function InfeasiblePanel({
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
      className="flex flex-col gap-3 rounded-md border border-warn/45 bg-warn/10 p-4 text-sm text-fg"
    >
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{notice.title}</p>
          <p className="text-muted">{notice.body}</p>
        </div>
      </div>
      {suggest !== null && (
        <Button size="sm" variant="secondary" className="self-start" onClick={() => onUseBudget(suggest)}>
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

  const millions = parseBudgetMillions(values.budget);

  const send = (next: QuickFormValues) => {
    const result = validateQuickForm(next);
    if (!result.ok) {
      setBudgetError(result.errors.budget);
      return;
    }
    setBudgetError(undefined);
    quick.submit(result.request);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(values);
  };
  const retryWithBudget = (m: number) => {
    const next = { ...values, budget: String(m) };
    onChange(next);
    send(next);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent-ink">
          <Sparkles className="size-3.5" aria-hidden />
          Gợi ý nhanh
        </span>
        <h2 className="text-xl font-bold text-fg">Ngân sách và mục đích, nhận 3 cấu hình</h2>
        <p className="max-w-prose text-sm text-muted">
          Bộ giải chọn linh kiện còn hàng, kiểm tra tương thích và xếp theo hiệu năng trên giá. Không cần gõ
          câu hỏi.
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
        <Input
          name="budget"
          mono
          inputMode="decimal"
          autoComplete="off"
          value={values.budget}
          onChange={(e) => {
            set('budget', e.target.value);
            if (budgetError) setBudgetError(undefined);
          }}
          trailing="triệu"
          wrapperClassName="sm:max-w-48"
        />
      </Field>
      <input
        type="range"
        min={BUDGET_MIN_M}
        max={BUDGET_MAX_M}
        step={1}
        value={sliderBudget(values.budget)}
        onChange={(e) => {
          set('budget', e.target.value);
          setBudgetError(undefined);
        }}
        aria-label="Kéo để chọn ngân sách (triệu đồng)"
        aria-valuetext={`${sliderBudget(values.budget)} triệu đồng`}
        className="-mt-4 h-8 w-full accent-accent"
      />

      <PurposePicker value={values.purpose} onChange={(p) => set('purpose', p)} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-0.5 text-sm font-medium text-fg">
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
        <ResultStatus quick={quick} onUseBudget={retryWithBudget} />
      </div>
    </form>
  );
}
