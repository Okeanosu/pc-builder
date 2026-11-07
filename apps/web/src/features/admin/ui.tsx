'use client';

import { ChevronLeft, ChevronRight, Lock, RotateCw, Search, TriangleExclamationPoint } from 'lucide-react';
import { type ComponentPropsWithRef, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { errorMessage } from './errors';

/** Error block with a retry button; used for every failed query in the admin. */
export function QueryError({
  error,
  onRetry,
  title = 'Không tải được dữ liệu',
  compact = true,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}) {
  return (
    <EmptyState
      tone="error"
      compact={compact}
      icon={<TriangleExclamationPoint />}
      title={title}
      description={`${errorMessage(error)} Thử tải lại; nếu vẫn lỗi, kiểm tra máy chủ API.`}
      actions={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden />
            Tải lại
          </Button>
        )
      }
    />
  );
}

/** Horizontal scroller with the admin table look. Children: a <table>. */
export function TableFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

export const th = 'h-10 whitespace-nowrap px-4 text-start text-xs font-semibold text-muted';
export const thEnd = 'h-10 whitespace-nowrap px-4 text-end text-xs font-semibold text-muted';
export const td = 'px-4 py-3 align-middle';
export const tableClass = 'w-full border-collapse text-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-border';

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border" aria-hidden>
      {Array.from({ length: rows }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cells
              key={c}
              className={cn('h-4', c === 0 ? 'w-2/5' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Phân trang"
      className={cn('flex flex-wrap items-center justify-between gap-3 text-sm text-muted', className)}
    >
      <span>
        <span className="font-mono tabular-nums">
          {from}–{to}
        </span>{' '}
        trên <span className="font-mono tabular-nums">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft aria-hidden />
          <span className="max-sm:sr-only">Trước</span>
        </Button>
        <span className="font-mono text-fg tabular-nums">
          {page}/{pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Trang sau"
        >
          <span className="max-sm:sr-only">Sau</span>
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

/** Search box that reports after the user pauses typing, so each keystroke is not a request. */
export function SearchBox({
  value,
  onSearch,
  placeholder,
  delay = 350,
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  onSearch: (q: string) => void;
  placeholder: string;
  delay?: number;
  className?: string;
  'aria-label': string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text.trim() === value.trim()) return;
    const t = setTimeout(() => onSearch(text.trim()), delay);
    return () => clearTimeout(t);
  }, [text, value, delay, onSearch]);
  return (
    <Input
      type="search"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      leading={<Search aria-hidden />}
      wrapperClassName={className}
    />
  );
}

/** Shown to STAFF on ADMIN-only editors. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-warn/45 bg-warn/10 px-4 py-3 text-sm text-fg">
      <Lock className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

export function SectionTitle({ className, ...props }: ComponentPropsWithRef<'h2'>) {
  return <h2 className={cn('text-base font-semibold text-fg', className)} {...props} />;
}

/** Faded while a list refetches, so the frame stays put instead of flashing a skeleton. */
export function refetchClass(fetching: boolean, hasData: boolean) {
  return cn('transition-opacity duration-150', fetching && hasData && 'opacity-60');
}

/** Placeholder shown while a route's URL data resolves on the client. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-[420px] rounded-md" />
    </div>
  );
}
