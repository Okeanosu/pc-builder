'use client';

import type { CompatibilityIssue } from '@pc/engine';
import { CATEGORY_LABELS, type CategoryKey, type ProductDTO } from '@pc/shared';
import { OctagonX, Plus, RefreshCw, TriangleExclamationPoint, X } from 'lucide-react';
import { CategoryIllustration } from '@/components/domain/CategoryIllustration';
import { CATEGORY_DESIGNATOR } from '@/components/domain/category';
import { ProductCard } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Severity } from './compat';
import { categoryInSentence } from './labels';

interface BuildSlotProps {
  category: CategoryKey;
  product?: ProductDTO;
  severity?: Severity;
  /** Issues that name this slot (budget rule excluded). */
  issues?: CompatibilityIssue[];
  onPick: () => void;
  onRemove: () => void;
  className?: string;
}

export function BuildSlot({
  category,
  product,
  severity,
  issues = [],
  onPick,
  onRemove,
  className,
}: BuildSlotProps) {
  const label = CATEGORY_LABELS[category];
  return (
    <li
      className={cn(
        'grid gap-x-4 gap-y-2 rounded-md transition-colors sm:grid-cols-[7.5rem_minmax(0,1fr)]',
        severity && 'p-2 sm:p-3',
        severity === 'error' && 'bg-danger/8 ring-1 ring-danger/45',
        severity === 'warning' && 'bg-warn/8 ring-1 ring-warn/40',
        className,
      )}
      aria-label={label}
    >
      <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5 sm:pt-3">
        <span className="tabular-nums text-xs font-semibold tracking-wider text-accent-ink">
          {CATEGORY_DESIGNATOR[category]}
        </span>
        <span className="text-sm font-medium text-fg">{label}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {product ? (
          <ProductCard
            product={product}
            variant="list"
            maxSpecs={4}
            className={cn(
              severity === 'error' && 'border-danger/50',
              severity === 'warning' && 'border-warn/50',
            )}
            action={
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onPick}
                  aria-label={`Đổi ${categoryInSentence(category)}`}
                  className="@max-[26rem]:w-8 @max-[26rem]:px-0"
                >
                  <RefreshCw aria-hidden />
                  <span className="@max-[26rem]:sr-only">Đổi</span>
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={onRemove}
                  aria-label={`Bỏ ${categoryInSentence(category)}`}
                  title={`Bỏ ${categoryInSentence(category)}`}
                >
                  <X aria-hidden />
                </Button>
              </div>
            }
          />
        ) : (
          <button
            type="button"
            onClick={onPick}
            className={cn(
              'focus-ring group flex min-h-24 w-full items-center gap-4 rounded-md border-[1.5px] border-dashed border-border-strong px-4 py-3 text-start transition-colors hover:border-accent hover:bg-accent/6',
              severity === 'error' && 'border-danger/60',
            )}
          >
            <CategoryIllustration
              category={category}
              className="h-12 w-16 shrink-0 text-muted transition-colors group-hover:text-fg"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold text-fg">Chọn {categoryInSentence(category)}</span>
              <span className="text-xs text-muted">
                Chỉ hiện linh kiện còn hàng, kèm kiểm tra tương thích
              </span>
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-accent text-accent-fg shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]">
              <Plus className="size-4" aria-hidden />
            </span>
          </button>
        )}

        {issues.length > 0 && (
          <ul className="flex flex-col gap-1">
            {issues.map((i) => (
              <li
                key={`${i.code}-${i.message}`}
                className={cn(
                  'flex items-start gap-2 text-sm',
                  i.severity === 'error' ? 'text-danger-ink' : 'text-warn-ink',
                )}
              >
                {i.severity === 'error' ? (
                  <OctagonX className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : (
                  <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                <span>
                  <span className="tabular-nums font-semibold">{i.code}</span>{' '}
                  <span className="text-fg">{i.message}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
