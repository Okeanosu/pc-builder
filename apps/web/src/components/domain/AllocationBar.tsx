'use client';

import { CATEGORY_KEYS, CATEGORY_LABELS, type CategoryKey } from '@pc/shared';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatPercent, formatVnd } from '@/lib/format';
import { CATEGORY_COLOR } from './category';

const HEIGHTS = { sm: 'h-2', md: 'h-3', lg: 'h-4' } as const;

interface AllocationBarProps {
  /** Share of the total per category, 0..1 (BuildDTO.allocation). Normalised if it does not sum to 1. */
  allocation: Partial<Record<CategoryKey, number>>;
  /** Exact VND per category for the legend; otherwise derived from `total × share` when `total` is given. */
  amounts?: Partial<Record<CategoryKey, number>>;
  total?: number;
  /** `full`: grid with % and amounts. `compact`: one wrapping line. `none`: bar only (keep a legend nearby). */
  legend?: 'full' | 'compact' | 'none';
  size?: keyof typeof HEIGHTS;
  /** Fill left→right on mount. Width changes always animate (e.g. after "bớt 3 triệu"). */
  animate?: boolean;
  className?: string;
}

export function AllocationBar({
  allocation,
  amounts,
  total,
  legend = 'full',
  size = 'md',
  animate = true,
  className,
}: AllocationBarProps) {
  const [active, setActive] = useState<CategoryKey | null>(null);
  const entries = CATEGORY_KEYS.flatMap((key) => {
    const share = allocation[key] ?? 0;
    return share > 0 ? [{ key, share }] : [];
  });
  const sum = entries.reduce((s, e) => s + e.share, 0) || 1;
  const rows = entries.map((e) => {
    const share = e.share / sum;
    const amount = amounts?.[e.key] ?? (total !== undefined ? Math.round(total * share) : undefined);
    return { ...e, share, amount };
  });
  const summary = rows.map((r) => `${CATEGORY_LABELS[r.key]} ${formatPercent(r.share)}`).join(', ');

  return (
    <div className={cn('@container flex flex-col gap-3', className)}>
      <div
        role="img"
        aria-label={`Phân bổ ngân sách: ${summary}`}
        className={cn(
          'flex w-full gap-0.5 overflow-hidden rounded-xs',
          HEIGHTS[size],
          animate && 'animate-wipe-in',
        )}
      >
        {rows.map((r) => (
          <div
            key={r.key}
            title={`${CATEGORY_LABELS[r.key]}: ${formatPercent(r.share, 1)}`}
            onPointerEnter={() => setActive(r.key)}
            onPointerLeave={() => setActive(null)}
            className={cn(
              'h-full min-w-[3px] basis-0 transition-[flex-grow,opacity] duration-500 ease-(--ease-out)',
              active && active !== r.key && 'opacity-35',
            )}
            style={{ flexGrow: r.share, backgroundColor: CATEGORY_COLOR[r.key] }}
          />
        ))}
      </div>

      {legend !== 'none' && (
        <ul
          className={cn(
            legend === 'full'
              ? 'grid grid-cols-2 gap-x-4 gap-y-2.5 @min-[30rem]:grid-cols-4'
              : 'flex flex-wrap gap-x-3.5 gap-y-1.5',
          )}
        >
          {rows.map((r) => (
            <li
              key={r.key}
              onPointerEnter={() => setActive(r.key)}
              onPointerLeave={() => setActive(null)}
              className={cn(
                'flex min-w-0 gap-2 transition-opacity duration-200',
                legend === 'full' ? 'items-start' : 'items-center',
                active && active !== r.key && 'opacity-45',
              )}
            >
              <span
                aria-hidden
                className={cn('size-2.5 shrink-0 rounded-[2px]', legend === 'full' && 'mt-1')}
                style={{ backgroundColor: CATEGORY_COLOR[r.key] }}
              />
              {legend === 'full' ? (
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-xs text-muted">{CATEGORY_LABELS[r.key]}</span>
                    <span className="text-xs font-semibold text-fg tabular-nums">
                      {formatPercent(r.share)}
                    </span>
                  </span>
                  {r.amount !== undefined && (
                    <span className="text-xs text-muted tabular-nums">{formatVnd(r.amount)}</span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-muted">
                  {CATEGORY_LABELS[r.key]}{' '}
                  <span className="font-semibold text-fg tabular-nums">{formatPercent(r.share)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
