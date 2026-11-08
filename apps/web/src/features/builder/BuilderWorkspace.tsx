'use client';

import { CATEGORY_KEYS, type CategoryKey, PURPOSE_LABELS, PURPOSES, type Purpose } from '@pc/shared';
import { FileDown, MessageSquareText, Save, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { SheetTotal } from '@/features/advisor/BuildSheet';
import { useHeaderOffset } from '@/features/advisor/useHeaderOffset';
import { ApiError } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { useBuilderStore } from '@/stores/builder';
import { BuildSlot } from './BuildSlot';
import { type BuildSummary, BuildSummaryBar, BuildSummaryPanel, IssueList } from './BuildSummaryBar';
import { buildReport, slotSeverity } from './compat';
import { PartPicker } from './PartPicker';
import { useBuilderActions } from './useBuilderActions';

const vnd = new Intl.NumberFormat('vi-VN');
const PURPOSE_OPTIONS = PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABELS[p] }));

/**
 * Hydrates the persisted build once, then applies each new `?build=` / `?add=` (also when they change
 * while the page stays mounted, e.g. from the chat widget) and strips them from the URL.
 */
function useBuilderBootstrap() {
  const params = useSearchParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const hydration = useRef<Promise<void> | null>(null);
  const handled = useRef<string | null>(null);
  const buildId = params.get('build');
  const addId = params.get('add');

  useEffect(() => {
    const key = `${buildId ?? ''}|${addId ?? ''}`;
    if (handled.current === key) return;
    const firstRun = handled.current === null;
    handled.current = key;
    void (async () => {
      const store = useBuilderStore;
      hydration.current ??= Promise.resolve(store.persist.rehydrate());
      await hydration.current;
      if (buildId) {
        try {
          const build = await store.getState().loadBuild(buildId);
          toast({
            tone: 'success',
            title: 'Đã mở cấu hình trong Customizer',
            description: `${build.items.length} linh kiện. Đổi món nào, tương thích được kiểm tra ngay.`,
          });
        } catch (err) {
          toast({
            tone: 'error',
            title: 'Không mở được cấu hình',
            description:
              err instanceof ApiError && err.status === 404
                ? 'Cấu hình này không còn tồn tại. Bạn vẫn có thể tự chọn linh kiện.'
                : 'Không kết nối được máy chủ. Thử tải lại trang.',
          });
        }
      } else if (firstRun) {
        void store
          .getState()
          .refreshParts()
          .catch(() => undefined);
      }
      if (addId) {
        try {
          const p = await store.getState().add(addId);
          toast({ tone: 'success', title: 'Đã thêm vào cấu hình', description: p.name });
        } catch (err) {
          toast({
            tone: 'error',
            title: 'Không thêm được sản phẩm',
            description:
              err instanceof ApiError && err.status === 404
                ? 'Sản phẩm này không còn bán. Chọn món khác trong danh sách.'
                : 'Không kết nối được máy chủ. Thử tải lại trang.',
          });
        }
      }
      if (buildId || addId) router.replace('/builder', { scroll: false });
      setReady(true);
    })();
  }, [buildId, addId, router]);

  return ready;
}

function BudgetInput({ disabled }: { disabled: boolean }) {
  const budget = useBuilderStore((s) => s.budget);
  const setBudget = useBuilderStore((s) => s.setBudget);
  return (
    <Field label="Ngân sách" hint="Không bắt buộc. Có ngân sách thì cảnh báo khi vượt hoặc dùng quá ít.">
      <Input
        inputMode="numeric"
        className="tabular-nums"
        placeholder="Ví dụ 25.000.000"
        value={budget ? vnd.format(budget) : ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
          setBudget(digits ? Number(digits) : null);
        }}
        trailing="₫"
        disabled={disabled}
      />
    </Field>
  );
}

function ClearBuildButton({ disabled }: { disabled: boolean }) {
  const clear = useBuilderStore((s) => s.clear);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} className="text-muted hover:text-fg">
          <Trash2 aria-hidden />
          Xóa cấu hình
        </Button>
      </DialogTrigger>
      <DialogContent
        size="sm"
        title="Xóa toàn bộ linh kiện đã chọn?"
        description="Các slot sẽ trống lại. Cấu hình đã lưu và giỏ hàng không bị ảnh hưởng."
      >
        <DialogBody className="pt-2 pb-4" />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Giữ lại</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="danger" onClick={clear}>
              Xóa cấu hình
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BuilderWorkspace() {
  const ready = useBuilderBootstrap();
  const offset = useHeaderOffset();
  const parts = useBuilderStore((s) => s.parts);
  const purpose = useBuilderStore((s) => s.purpose);
  const budget = useBuilderStore((s) => s.budget);
  const loadingBuild = useBuilderStore((s) => s.loadingBuild);
  const { setPart, remove, setPurpose } = useBuilderStore.getState();
  const [picking, setPicking] = useState<CategoryKey | null>(null);
  const actions = useBuilderActions();

  const report = useMemo(() => buildReport(parts, { purpose, budget }), [parts, purpose, budget]);
  const severity = useMemo(() => slotSeverity(report.issues), [report.issues]);
  const summary: BuildSummary = useMemo(() => {
    const amounts: BuildSummary['amounts'] = {};
    let total = 0;
    for (const k of CATEGORY_KEYS) {
      const p = parts[k];
      if (!p) continue;
      amounts[k] = p.salePrice ?? p.price;
      total += amounts[k];
    }
    const psu = parts.psu?.specs as { wattage?: number } | undefined;
    return {
      total,
      count: Object.keys(amounts).length,
      issues: report.issues,
      estimatedWattage: report.estimatedWattage,
      recommendedPsuWattage: report.recommendedPsuWattage,
      psuWattage: psu?.wattage,
      budget,
      amounts,
    };
  }, [parts, report, budget]);

  const summaryActions = {
    onAddToCart: actions.addToCart,
    onSave: actions.save,
    onAskAi: actions.askAi,
    onQuote: actions.quote,
    saving: actions.saving,
    addingToCart: actions.addingToCart,
  };
  const allocation = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(summary.amounts).map(([k, v]) => [k, (v ?? 0) / (summary.total || 1)]),
      ) as BuildSummary['amounts'],
    [summary],
  );
  const empty = summary.count === 0;
  const busy = !ready || loadingBuild;

  return (
    <WorkshopSurface data-workshop-shell className="flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-xl flex-col gap-2">
            <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
              Tự build PC
            </h1>
            <p className="text-sm text-muted">
              Chọn từng linh kiện; tương thích được kiểm tra ngay khi bạn chọn, kể cả trước khi bấm chọn trong
              danh sách.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:w-[30rem]">
            <Field label="Mục đích sử dụng">
              <Select
                value={purpose}
                onValueChange={(v) => setPurpose(v as Purpose)}
                options={PURPOSE_OPTIONS}
                disabled={busy}
              />
            </Field>
            <BudgetInput disabled={busy} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:hidden">
          <Button
            size="sm"
            variant="secondary"
            onClick={actions.save}
            disabled={empty}
            loading={actions.saving}
          >
            <Save aria-hidden />
            Lưu &amp; chia sẻ
          </Button>
          <Button size="sm" variant="outline" onClick={actions.askAi}>
            <MessageSquareText aria-hidden />
            Hỏi AI tối ưu
          </Button>
          <Button size="sm" variant="ghost" onClick={actions.quote} disabled={empty}>
            <FileDown aria-hidden />
            Báo giá PDF
          </Button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <section aria-label="Linh kiện" className="@container flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">
                Linh kiện{' '}
                <span className="text-sm font-normal text-muted tabular-nums">{summary.count}/8</span>
              </h2>
              <ClearBuildButton disabled={empty || busy} />
            </div>
            {summary.issues.length > 0 && (
              <div className="border-y border-border py-3 lg:hidden" role="status">
                <IssueList issues={summary.issues} />
              </div>
            )}
            {busy ? (
              <div className="flex flex-col gap-4" aria-busy>
                <Skeleton className="h-2 w-full" />
                <ul className="flex flex-col">
                  {CATEGORY_KEYS.map((k) => (
                    <li key={k} className="flex items-center gap-4 border-b border-border py-4">
                      <Skeleton className="h-4 w-24 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {summary.count > 0 ? (
                  <AllocationBar allocation={allocation} legend="none" size="sm" />
                ) : (
                  <div className="h-2 rounded-xs bg-surface-2" aria-hidden />
                )}
                <div className="flex flex-col">
                  <ol className="flex flex-col">
                    {CATEGORY_KEYS.map((k) => (
                      <BuildSlot
                        key={k}
                        category={k}
                        product={parts[k]}
                        severity={severity[k]}
                        issues={report.issues.filter((i) => i.code !== 'C14' && i.categories.includes(k))}
                        onPick={() => setPicking(k)}
                        onRemove={() => remove(k)}
                      />
                    ))}
                  </ol>
                  <SheetTotal
                    label={`Tổng ${summary.count}/8 linh kiện`}
                    note={
                      budget ? (
                        summary.total > budget ? (
                          <span className="font-medium text-danger-ink">
                            vượt ngân sách {formatVnd(summary.total - budget)}
                          </span>
                        ) : (
                          `còn dư ${formatVnd(budget - summary.total)}`
                        )
                      ) : undefined
                    }
                    amount={summary.total}
                  />
                </div>
              </div>
            )}
          </section>

          <aside
            className="max-lg:hidden lg:sticky"
            style={{ top: offset + 24 }}
            aria-label="Tổng quan cấu hình"
          >
            <BuildSummaryPanel summary={summary} actions={summaryActions} />
          </aside>
        </div>
      </div>

      <BuildSummaryBar summary={summary} actions={summaryActions} className="lg:hidden" />

      <PartPicker
        category={picking}
        parts={parts}
        context={{ purpose, budget }}
        onOpenChange={(open) => !open && setPicking(null)}
        onChoose={(p) => {
          setPart(p);
          setPicking(null);
        }}
        onRemove={(k) => {
          remove(k);
          setPicking(null);
        }}
      />
    </WorkshopSurface>
  );
}
