'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QtyStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  /** Names the product for screen readers, e.g. "Số lượng Ryzen 5 7600". */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  label,
  size = 'md',
  className,
}: QtyStepperProps) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const btn = cn(
    'focus-ring grid shrink-0 place-items-center text-fg transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40',
    size === 'sm' ? 'size-8' : 'size-10',
  );
  return (
    <fieldset
      aria-label={label}
      className={cn(
        'inline-flex items-center overflow-hidden rounded-sm border border-border-strong bg-surface',
        h,
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Giảm số lượng"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className={cn('grid min-w-9 place-items-center font-mono text-sm font-semibold tabular-nums', h)}
      >
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Tăng số lượng"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </fieldset>
  );
}
