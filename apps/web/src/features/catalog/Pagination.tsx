'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { pageWindow } from './listing-query';

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  onNavigate: (page: number) => void;
}

const cell =
  'focus-ring inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm tabular-nums transition-colors';

/** Real links (crawlable, open in new tab) that switch pages in place on a plain click. */
export function Pagination({ page, totalPages, hrefFor, onNavigate }: PaginationProps) {
  if (totalPages <= 1) return null;
  const go = (p: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(p);
  };
  const edge = (p: number, label: string, icon: ReactNode, disabled: boolean) =>
    disabled ? (
      <span className={cn(cell, 'text-muted opacity-45')} aria-hidden>
        {icon}
      </span>
    ) : (
      <a
        href={hrefFor(p)}
        onClick={go(p)}
        aria-label={label}
        className={cn(cell, 'text-fg hover:bg-surface-2')}
      >
        {icon}
      </a>
    );

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-1">
      {edge(page - 1, 'Trang trước', <ChevronLeft className="size-4" />, page <= 1)}
      <ul className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity
            <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
              …
            </li>
          ) : (
            <li key={p}>
              <a
                href={hrefFor(p)}
                onClick={go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Trang ${p}`}
                className={cn(
                  cell,
                  p === page
                    ? 'border border-fg font-semibold text-fg'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {p}
              </a>
            </li>
          ),
        )}
      </ul>
      {edge(page + 1, 'Trang sau', <ChevronRight className="size-4" />, page >= totalPages)}
    </nav>
  );
}
