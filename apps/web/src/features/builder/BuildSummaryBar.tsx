'use client';

import type { CompatibilityIssue } from '@pc/engine';
import type { CategoryKey } from '@pc/shared';
import {
  FileDown,
  Gauge,
  OctagonX,
  Save,
  ShoppingCart,
  Sparkles,
  TriangleExclamationPoint,
} from 'lucide-react';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CompatibilityBadge, getCompatibilityStatus } from '@/components/domain/CompatibilityBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { formatPercent, formatVnd } from '@/lib/format';

export interface BuildSummary {
  total: number;
  count: number;
  issues: CompatibilityIssue[];
  estimatedWattage: number;
  recommendedPsuWattage: number;
  psuWattage?: number;
  budget: number | null;
  amounts: Partial<Record<CategoryKey, number>>;
}

export interface BuildSummaryActions {
  onAddToCart: () => void;
  onSave: () => void;
  onAskAi: () => void;
  onQuote: () => void;
  saving?: boolean;
  addingToCart?: boolean;
}

function psuTone(issues: readonly CompatibilityIssue[]): 'ok' | 'warn' | 'danger' {
  const c08 = issues.find((i) => i.code === 'C08');
  if (!c08) return 'ok';
  return c08.severity === 'error' ? 'danger' : 'warn';
}

export function WattageLine({ summary, className }: { summary: BuildSummary; className?: string }) {
  const { estimatedWattage, psuWattage, recommendedPsuWattage, issues } = summary;
  const tone = psuTone(issues);
  const ratio = psuWattage ? Math.min(1, estimatedWattage / psuWattage) : 0;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Gauge className="size-4" aria-hidden />
          Công suất ước tính
        </span>
        <span className="font-mono text-fg tabular-nums">
          ~{estimatedWattage}W{psuWattage ? <span className="text-muted"> / nguồn {psuWattage}W</span> : null}
        </span>
      </div>
      {psuWattage ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-(--ease-out)',
              tone === 'ok' && 'bg-ok',
              tone === 'warn' && 'bg-warn',
              tone === 'danger' && 'bg-danger',
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted">Nên chọn nguồn từ {recommendedPsuWattage}W trở lên.</p>
      )}
    </div>
  );
}

export function IssueList({
  issues,
  className,
}: {
  issues: readonly CompatibilityIssue[];
  className?: string;
}) {
  if (issues.length === 0) return null;
  const sorted = [...issues].sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
  return (
    <ul className={cn('flex flex-col gap-2', className)} aria-label="Vấn đề tương thích">
      {sorted.map((i) => (
        <li key={`${i.code}-${i.message}`} className="flex items-start gap-2 text-sm">
          {i.severity === 'error' ? (
            <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
          ) : (
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
          )}
          <span className="text-fg">
            <span
              className={cn(
                'me-1.5 font-mono font-semibold',
                i.severity === 'error' ? 'text-danger-ink' : 'text-warn-ink',
              )}
            >
              {i.code}
            </span>
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

function statusSentence(issues: readonly CompatibilityIssue[], count: number): string {
  if (count === 0) return 'Chưa chọn linh kiện nào.';
  const status = getCompatibilityStatus(issues);
  if (status === 'error') return 'Cần sửa các xung đột dưới đây trước khi lưu hoặc mua.';
  if (status === 'warning') return 'Lắp được, nhưng nên xem các cảnh báo.';
  return count === 8 ? 'Đủ 8 linh kiện và tương thích.' : `Đã chọn ${count}/8 linh kiện, chưa có xung đột.`;
}

/** Desktop "Tổng quan" column: status, total, budget, power, allocation, issues and actions. */
export function BuildSummaryPanel({
  summary,
  actions,
  className,
}: {
  summary: BuildSummary;
  actions: BuildSummaryActions;
  className?: string;
}) {
  const { total, count, issues, budget, amounts } = summary;
  const empty = count === 0;
  return (
    <Card className={cn('flex flex-col gap-5 p-5', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-fg">Tổng quan</h2>
          {!empty && <CompatibilityBadge issues={issues} />}
        </div>
        <p className="text-sm text-muted">{statusSentence(issues, count)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <Price amount={total} size="2xl" />
        {budget ? (
          <span className={cn('text-xs', total > budget ? 'font-medium text-danger-ink' : 'text-muted')}>
            {total > budget
              ? `Vượt ngân sách ${formatVnd(total - budget)}`
              : `Dùng ${formatPercent(total / budget)} ngân sách ${formatVnd(budget)}`}
          </span>
        ) : (
          <span className="text-xs text-muted">{count}/8 linh kiện</span>
        )}
      </div>

      {!empty && <WattageLine summary={summary} />}
      {count > 1 && (
        <AllocationBar
          allocation={Object.fromEntries(
            Object.entries(amounts).map(([k, v]) => [k, (v ?? 0) / (total || 1)]),
          )}
          amounts={amounts}
          total={total}
          size="sm"
          legend="compact"
        />
      )}
      <IssueList issues={issues} className="border-t border-border pt-4" />

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button onClick={actions.onAddToCart} disabled={empty} loading={actions.addingToCart}>
          <ShoppingCart aria-hidden />
          Thêm vào giỏ
        </Button>
        <Button variant="secondary" onClick={actions.onSave} disabled={empty} loading={actions.saving}>
          <Save aria-hidden />
          Lưu &amp; chia sẻ
        </Button>
        <Button variant="workshop" onClick={actions.onAskAi}>
          <Sparkles aria-hidden />
          Hỏi AI tối ưu
        </Button>
        <Button
          variant="ghost"
          onClick={actions.onQuote}
          disabled={empty}
          className="text-muted hover:text-fg"
        >
          <FileDown aria-hidden />
          Báo giá PDF
        </Button>
      </div>
    </Card>
  );
}

/** Phone: sticky bottom bar with the total, power draw, status and the main action. */
export function BuildSummaryBar({
  summary,
  actions,
  className,
}: {
  summary: BuildSummary;
  actions: BuildSummaryActions;
  className?: string;
}) {
  const { total, count, issues, estimatedWattage, psuWattage } = summary;
  return (
    <div
      className={cn(
        'sticky bottom-0 z-30 border-t border-border bg-surface/92 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Price amount={total} size="xl" />
          <span className="truncate font-mono text-xs text-muted tabular-nums">
            ~{estimatedWattage}W{psuWattage ? ` / nguồn ${psuWattage}W` : ''} · {count}/8 linh kiện
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && <CompatibilityBadge size="sm" issues={issues} />}
          <Button
            size="sm"
            onClick={actions.onAddToCart}
            disabled={count === 0}
            loading={actions.addingToCart}
            aria-label="Thêm vào giỏ"
          >
            <ShoppingCart aria-hidden />
            <span className="max-[380px]:sr-only">Thêm vào giỏ</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
