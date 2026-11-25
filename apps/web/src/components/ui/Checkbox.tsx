'use client';

import { Check, Minus } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { type ComponentPropsWithRef, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends ComponentPropsWithRef<typeof CheckboxPrimitive.Root> {
  label?: ReactNode;
  description?: ReactNode;
  /** Trailing meta such as a facet count. */
  meta?: ReactNode;
}

export function Checkbox({ label, description, meta, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const box = (
    <CheckboxPrimitive.Root
      id={controlId}
      aria-describedby={description ? `${controlId}-desc` : undefined}
      className={cn(
        'focus-ring peer grid size-[18px] shrink-0 place-items-center rounded-xs border border-border-strong bg-surface text-accent-fg transition-colors hover:border-fg/60 disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        !label && className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group">
        <Check className="size-3.5 group-data-[state=indeterminate]:hidden" strokeWidth={3} aria-hidden />
        <Minus
          className="hidden size-3.5 group-data-[state=indeterminate]:block"
          strokeWidth={3}
          aria-hidden
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  if (!label) return box;
  return (
    <div className={cn('group/cb flex items-start gap-2.5', className)}>
      <div className="flex h-5 items-center">{box}</div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <label
          htmlFor={controlId}
          className="flex cursor-pointer items-baseline justify-between gap-2 text-sm text-fg group-has-disabled/cb:cursor-not-allowed group-has-disabled/cb:text-muted"
        >
          <span className="min-w-0">{label}</span>
          {meta !== undefined && <span className="text-xs text-muted tabular-nums">{meta}</span>}
        </label>
        {description && (
          <p id={`${controlId}-desc`} className="text-xs text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
