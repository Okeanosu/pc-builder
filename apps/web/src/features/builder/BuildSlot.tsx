'use client';

import type { CompatibilityIssue } from '@pc/engine';
import { CATEGORY_LABELS, type CategoryKey, type ProductDTO } from '@pc/shared';
import { OctagonX, Plus, TriangleExclamationPoint, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CategoryLabel, formatSheetPrice } from '@/features/advisor/BuildSheet';
import { cn } from '@/lib/cn';
import { formatKeySpec } from '@/lib/format';
import type { Severity } from './compat';
import { categoryInSentence } from './labels';

/**
 * A build sheet row with actions. Phones (container under 36rem): category + price, then the part + actions.
 * Wider: category | part | price | actions on one line, so prices line up down the sheet.
 */
const GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 @min-[36rem]:grid-cols-[8rem_minmax(0,1fr)_6rem_6rem] @min-[36rem]:gap-x-4';
const AREAS =
  "[grid-template-areas:'label_price'_'part_actions'] @min-[36rem]:[grid-template-areas:'label_part_price_actions']";
const AREAS_WITH_ISSUES =
  "[grid-template-areas:'label_price'_'part_actions'_'issues_issues'] @min-[36rem]:[grid-template-areas:'label_part_price_actions'_'._issues_issues_issues']";

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
  const noun = categoryInSentence(category);
  const specs = product
    ? Object.entries(product.keySpecs)
        .map(([k, v]) => formatKeySpec(k, v))
        .filter((t): t is string => Boolean(t))
        .slice(0, 3)
    : [];

  return (
    <li
      className={cn(
        GRID,
        issues.length > 0 ? AREAS_WITH_ISSUES : AREAS,
        'border-b border-border py-3',
        className,
      )}
      aria-label={label}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm [grid-area:label]">
        <CategoryLabel category={category} />
        {severity === 'error' && (
          <>
            <OctagonX className="size-3.5 shrink-0 text-danger-ink" aria-hidden />
            <span className="sr-only">có xung đột</span>
          </>
        )}
        {severity === 'warning' && (
          <>
            <TriangleExclamationPoint className="size-3.5 shrink-0 text-warn-ink" aria-hidden />
            <span className="sr-only">có cảnh báo</span>
          </>
        )}
      </span>

      {product ? (
        <>
          <span className="flex min-w-0 flex-col gap-0.5 [grid-area:part]">
            <Link
              href={`/p/${product.slug}`}
              title={product.name}
              className="focus-ring truncate rounded-xs text-[0.9375rem] font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
            >
              {product.name}
            </Link>
            {specs.length > 0 && (
              <span className="truncate text-sm text-muted tabular-nums">{specs.join(', ')}</span>
            )}
          </span>
          <span className="text-end text-sm text-fg tabular-nums [grid-area:price]">
            {formatSheetPrice(product.salePrice ?? product.price)}
          </span>
          <span className="flex items-center justify-end gap-1 [grid-area:actions]">
            <Button size="sm" variant="secondary" onClick={onPick} aria-label={`Đổi ${noun}`}>
              Đổi
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              aria-label={`Bỏ ${noun}`}
              title={`Bỏ ${noun}`}
              className="text-muted hover:text-fg"
            >
              <X aria-hidden />
            </Button>
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onPick}
            className="focus-ring group -my-1 flex min-w-0 items-center gap-2 justify-self-start rounded-xs py-1 text-start text-[0.9375rem] font-medium text-fg [grid-area:part]"
          >
            <Plus className="size-4 shrink-0 text-muted group-hover:text-fg" aria-hidden />
            <span className="decoration-1 underline-offset-[3px] group-hover:underline">Chọn {noun}</span>
          </button>
          <span className="text-end text-sm text-muted [grid-area:price]">
            <span aria-hidden>—</span>
            <span className="sr-only">Chưa chọn</span>
          </span>
        </>
      )}

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 [grid-area:issues]">
          {issues.map((i) => (
            <li key={`${i.code}-${i.message}`} className="flex items-start gap-2 text-sm">
              {i.severity === 'error' ? (
                <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
              ) : (
                <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
              )}
              <span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    i.severity === 'error' ? 'text-danger-ink' : 'text-warn-ink',
                  )}
                >
                  {i.code}
                </span>{' '}
                <span className="text-fg">{i.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
