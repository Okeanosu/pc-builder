'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export const buttonVariants = cva(
  'focus-ring relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color] duration-150 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** The one action colour: ink fill (black on light, white on dark). */
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
        outline: 'border border-border-strong bg-transparent text-fg hover:border-fg',
        ghost: 'text-fg hover:bg-surface-2',
        danger: 'border border-danger/50 bg-transparent text-danger-ink hover:bg-danger/8',
        /** Entry point into the AI advisor from the header. Kept as its own name so call sites read clearly. */
        workshop: 'bg-accent text-accent-fg hover:bg-accent-hover',
        link: 'h-auto rounded-xs px-0 text-accent-ink underline decoration-border-strong underline-offset-4 hover:decoration-current',
      },
      size: {
        sm: 'h-8 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-10 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-7 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-5',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ComponentPropsWithRef<'button'>, VariantProps<typeof buttonVariants> {
  /** Render the single child element (e.g. next/link) with button styling. */
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks. Ignored with `asChild`. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" label={null} />}
      {children}
    </button>
  );
}
