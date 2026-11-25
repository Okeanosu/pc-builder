import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

/** Placeholder block. Size it like the content it stands in for so the layout does not jump. */
export function Skeleton({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer rounded-xs bg-[linear-gradient(90deg,var(--color-surface-3)_0%,var(--color-surface-2)_50%,var(--color-surface-3)_100%)] bg-size-[200%_100%]',
        className,
      )}
      {...props}
    />
  );
}

/** Several text-line skeletons; the last line is shorter, like real paragraphs. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}
