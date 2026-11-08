import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  /** A lucide icon element, e.g. <PackageOpen />. */
  icon?: ReactNode;
  title: string;
  /** Say what happened and what to do next — never just "Không có dữ liệu". */
  description?: ReactNode;
  /** Primary / secondary buttons. */
  actions?: ReactNode;
  tone?: 'empty' | 'error';
  compact?: boolean;
  className?: string;
}

/** The icon sits on a round plate; the error tone tints it with danger. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  tone = 'empty',
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-3 px-4 py-8' : 'gap-4 px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'grid place-items-center rounded-full [&_svg]:size-6',
            compact ? 'size-12' : 'size-16',
            tone === 'error' ? 'bg-danger/10 text-danger-ink' : 'bg-surface-2 text-muted',
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className={cn('font-semibold text-fg', compact ? 'text-base' : 'text-lg')}>{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
