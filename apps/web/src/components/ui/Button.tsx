'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export const buttonVariants = cva(
  'focus-ring relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Main action. Cyan fill with graphite ink and a keycap edge. */
        primary:
          'bg-accent text-accent-fg shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-accent-hover active:shadow-none',
        secondary: 'border border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-surface-3',
        outline: 'border border-border-strong bg-transparent text-fg hover:bg-surface-2',
        ghost: 'text-fg hover:bg-surface-2',
        danger: 'border border-danger/40 bg-danger/10 text-danger-ink hover:bg-danger/20',
        /** Always-graphite entry point into the AI workshop, readable on light and dark pages. */
        workshop:
          'bg-graphite-950 text-graphite-100 shadow-[inset_0_0_0_1px_rgb(34_211_238/0.45)] hover:bg-graphite-800 hover:shadow-[inset_0_0_0_1px_rgb(34_211_238/0.8)]',
        link: 'h-auto rounded-xs px-0 text-accent-ink underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        sm: 'h-8 px-3 text-sm [&_svg]:size-4',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
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
