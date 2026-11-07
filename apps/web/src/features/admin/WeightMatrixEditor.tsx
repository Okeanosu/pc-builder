'use client';

import { DEFAULT_PROFILES } from '@pc/engine';
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
  PURPOSE_LABELS,
  PURPOSES,
  type Purpose,
  type PurposeWeightsDTO,
} from '@pc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, CircleCheck, RotateCcw, Save, TriangleExclamationPoint, Undo2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { adminApi } from './api';
import { errorMessage } from './errors';
import { formatDateTime, formatWeight } from './format';
import {
  checkWeights,
  isWeightDraftDirty,
  parseShare,
  sumHint,
  toWeightDraft,
  type WeightDraft,
  type WeightProfile,
} from './weights/weights';

type Drafts = Record<Purpose, WeightDraft>;

function savedProfile(rows: PurposeWeightsDTO[], purpose: Purpose): WeightProfile {
  return rows.find((r) => r.purpose === purpose) ?? DEFAULT_PROFILES[purpose];
}

function ShareBar({ category, value }: { category: CategoryKey; value: string }) {
  const n = parseShare(value);
  return (
    <div className="mt-1.5 h-1 rounded-full bg-surface-3" aria-hidden>
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${n === 'invalid' ? 0 : n * 100}%`, background: CATEGORY_COLOR[category] }}
      />
    </div>
  );
}

function BandBar({ category, min, max }: { category: CategoryKey; min: string; max: string }) {
  const lo = parseShare(min);
  const hi = parseShare(max);
  const ok = lo !== 'invalid' && hi !== 'invalid' && lo <= hi;
  return (
    <div className="relative mt-1.5 h-1.5 rounded-full bg-surface-3" aria-hidden>
      {ok && (
        <div
          className="absolute inset-y-0 rounded-full opacity-60"
          style={{
            left: `${lo * 100}%`,
            width: `${Math.max(hi - lo, 0.01) * 100}%`,
            background: CATEGORY_COLOR[category],
          }}
        />
      )}
    </div>
  );
}

const cellInput = 'text-end';

interface WeightMatrixEditorProps {
  rows: PurposeWeightsDTO[];
  /** STAFF sees the matrix read-only. */
  canEdit: boolean;
}

/** Purpose × category weight matrix with live per-purpose sums; each purpose saves on its own. */
export function WeightMatrixEditor({ rows, canEdit }: WeightMatrixEditorProps) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Drafts>(
    () => Object.fromEntries(PURPOSES.map((p) => [p, toWeightDraft(savedProfile(rows, p))])) as Drafts,
  );
  const [open, setOpen] = useState<Partial<Record<CategoryKey, boolean>>>({});
  const [saving, setSaving] = useState<Purpose | null>(null);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Purpose, string>>>({});
  const allOpen = CATEGORY_KEYS.every((c) => open[c]);

  const checks = Object.fromEntries(PURPOSES.map((p) => [p, checkWeights(drafts[p])])) as Record<
    Purpose,
    ReturnType<typeof checkWeights>
  >;

  const setWeight = (p: Purpose, c: CategoryKey, value: string) =>
    setDrafts((d) => ({ ...d, [p]: { ...d[p], weights: { ...d[p].weights, [c]: value } } }));
  const setBound = (p: Purpose, c: CategoryKey, bound: 'min' | 'max', value: string) =>
    setDrafts((d) => ({
      ...d,
      [p]: { ...d[p], allocation: { ...d[p].allocation, [c]: { ...d[p].allocation[c], [bound]: value } } },
    }));

  const save = useMutation({
    mutationFn: async (p: Purpose) => {
      const input = checks[p].input;
      if (!input) throw new Error('invalid');
      setSaving(p);
      return adminApi.putWeights(p, input);
    },
    onSuccess: (saved) => {
      qc.setQueryData<PurposeWeightsDTO[]>(queryKeys.admin.weights, (list) => {
        const rest = (list ?? []).filter((r) => r.purpose !== saved.purpose);
        return [...rest, saved].sort((a, b) => PURPOSES.indexOf(a.purpose) - PURPOSES.indexOf(b.purpose));
      });
      setDrafts((d) => ({ ...d, [saved.purpose]: toWeightDraft(saved) }));
      setServerErrors((e) => ({ ...e, [saved.purpose]: undefined }));
      toast({
        title: `Đã lưu trọng số “${PURPOSE_LABELS[saved.purpose]}”`,
        description: 'Bộ nhớ đệm gợi ý đã được xóa; lần gợi ý tiếp theo dùng trọng số mới.',
        tone: 'success',
      });
    },
    onError: (err, p) => {
      setServerErrors((e) => ({ ...e, [p]: errorMessage(err) }));
      toast({ title: 'Chưa lưu được trọng số', description: errorMessage(err), tone: 'error' });
    },
    onSettled: () => setSaving(null),
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-sm text-muted">
          Mỗi cột là một nhu cầu; tổng trọng số của cột phải bằng{' '}
          <span className="font-mono text-fg">1,00</span>. Mở một dòng để sửa khoảng phân bổ ngân sách (tối
          thiểu – tối đa).
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(allOpen ? {} : Object.fromEntries(CATEGORY_KEYS.map((c) => [c, true])))}
        >
          {allOpen ? 'Thu gọn phân bổ' : 'Mở mọi dòng phân bổ'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-48 px-4 py-3 text-start text-xs font-semibold text-muted">
                Danh mục
              </th>
              {PURPOSES.map((p) => {
                const saved = rows.find((r) => r.purpose === p);
                const dirty = isWeightDraftDirty(drafts[p], savedProfile(rows, p));
                return (
                  <th key={p} scope="col" className="px-3 py-3 text-start align-bottom">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                      {PURPOSE_LABELS[p]}
                      {dirty && (
                        <Badge tone="accent" size="sm">
                          Chưa lưu
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-normal text-muted">
                      {saved
                        ? `Cập nhật ${formatDateTime(saved.updatedAt)}`
                        : 'Đang dùng mặc định của bộ máy'}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_KEYS.map((c) => (
              <Fragment key={c}>
                <tr className="border-b border-border">
                  <th scope="row" className="px-2 py-2 text-start font-medium">
                    <button
                      type="button"
                      aria-expanded={Boolean(open[c])}
                      aria-controls={`alloc-${c}`}
                      onClick={() => setOpen((o) => ({ ...o, [c]: !o[c] }))}
                      className="focus-ring flex h-9 w-full items-center gap-2 rounded-sm px-2 text-start hover:bg-surface-2"
                    >
                      <ChevronRight
                        className={cn(
                          'size-4 shrink-0 text-muted transition-transform',
                          open[c] && 'rotate-90',
                        )}
                        aria-hidden
                      />
                      <span
                        className="size-2.5 shrink-0 rounded-xs"
                        style={{ background: CATEGORY_COLOR[c] }}
                        aria-hidden
                      />
                      {CATEGORY_LABELS[c]}
                    </button>
                  </th>
                  {PURPOSES.map((p) => {
                    const invalid = Boolean(checks[p].cellErrors[`weights.${c}`]);
                    return (
                      <td key={p} className="px-3 py-2 align-top">
                        <Input
                          mono
                          size="sm"
                          inputMode="decimal"
                          value={drafts[p].weights[c]}
                          disabled={!canEdit}
                          invalid={invalid}
                          aria-label={`Trọng số ${CATEGORY_LABELS[c]} cho ${PURPOSE_LABELS[p]}`}
                          title={invalid ? checks[p].cellErrors[`weights.${c}`] : undefined}
                          onChange={(e) => setWeight(p, c, e.target.value)}
                          className={cellInput}
                        />
                        <ShareBar category={c} value={drafts[p].weights[c]} />
                      </td>
                    );
                  })}
                </tr>
                {open[c] && (
                  <tr id={`alloc-${c}`} className="border-b border-border bg-surface-2">
                    <td className="px-4 py-2.5 align-top text-xs text-muted">
                      Phân bổ ngân sách
                      <br />
                      (tối thiểu – tối đa)
                    </td>
                    {PURPOSES.map((p) => {
                      const a = drafts[p].allocation[c];
                      const errs = checks[p].cellErrors;
                      const rangeError = errs[`allocation.${c}`];
                      return (
                        <td key={p} className="px-3 py-2.5 align-top">
                          <div className="flex items-center gap-1.5">
                            <Input
                              mono
                              size="sm"
                              inputMode="decimal"
                              value={a.min}
                              disabled={!canEdit}
                              invalid={Boolean(errs[`allocation.${c}.min`] || rangeError)}
                              aria-label={`Tỷ lệ tối thiểu ${CATEGORY_LABELS[c]} cho ${PURPOSE_LABELS[p]}`}
                              onChange={(e) => setBound(p, c, 'min', e.target.value)}
                              wrapperClassName="min-w-0 shrink"
                              className={cellInput}
                            />
                            <span className="text-muted" aria-hidden>
                              –
                            </span>
                            <Input
                              mono
                              size="sm"
                              inputMode="decimal"
                              value={a.max}
                              disabled={!canEdit}
                              invalid={Boolean(errs[`allocation.${c}.max`] || rangeError)}
                              aria-label={`Tỷ lệ tối đa ${CATEGORY_LABELS[c]} cho ${PURPOSE_LABELS[p]}`}
                              onChange={(e) => setBound(p, c, 'max', e.target.value)}
                              wrapperClassName="min-w-0 shrink"
                              className={cellInput}
                            />
                          </div>
                          <BandBar category={c} min={a.min} max={a.max} />
                          {rangeError && (
                            <p className="mt-1 text-xs font-medium text-danger-ink">{rangeError}</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b border-border bg-surface-2">
              <th scope="row" className="px-4 py-3 text-start text-sm font-semibold">
                Tổng trọng số
              </th>
              {PURPOSES.map((p) => {
                const { sum, sumOk, cellErrors } = checks[p];
                const unreadable = Object.keys(cellErrors).some((k) => k.startsWith('weights.'));
                const hint = unreadable ? 'Sửa các ô không hợp lệ trước' : sumHint(sum);
                return (
                  <td key={p} className="px-3 py-3 align-top" aria-live="polite">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums',
                        sumOk && !unreadable ? 'text-ok-ink' : 'text-warn-ink',
                      )}
                    >
                      {sumOk && !unreadable ? (
                        <CircleCheck className="size-4" aria-hidden />
                      ) : (
                        <TriangleExclamationPoint className="size-4" aria-hidden />
                      )}
                      {formatWeight(sum)}
                    </div>
                    {hint && <p className="mt-0.5 text-xs text-warn-ink">{hint}</p>}
                    {serverErrors[p] && (
                      <p className="mt-0.5 text-xs font-medium text-danger-ink">{serverErrors[p]}</p>
                    )}
                  </td>
                );
              })}
            </tr>
            {canEdit && (
              <tr>
                <td className="px-4 py-3" />
                {PURPOSES.map((p) => {
                  const check = checks[p];
                  const saved = savedProfile(rows, p);
                  const dirty = isWeightDraftDirty(drafts[p], saved);
                  const isDefault = !isWeightDraftDirty(drafts[p], DEFAULT_PROFILES[p]);
                  return (
                    <td key={p} className="px-3 py-3 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <Button
                          size="sm"
                          disabled={!dirty || !check.input || (saving !== null && saving !== p)}
                          loading={saving === p}
                          onClick={() => save.mutate(p)}
                          title={
                            !check.input ? 'Tổng trọng số phải bằng 1,00 và mọi ô phải hợp lệ' : undefined
                          }
                        >
                          <Save aria-hidden />
                          Lưu
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          disabled={isDefault}
                          onClick={() =>
                            setDrafts((d) => ({ ...d, [p]: toWeightDraft(DEFAULT_PROFILES[p]) }))
                          }
                        >
                          <RotateCcw aria-hidden />
                          Khôi phục mặc định
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          disabled={!dirty}
                          onClick={() => setDrafts((d) => ({ ...d, [p]: toWeightDraft(saved) }))}
                        >
                          <Undo2 aria-hidden />
                          Hoàn tác
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
